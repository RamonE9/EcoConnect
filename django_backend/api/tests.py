import tempfile
from datetime import timedelta
from io import BytesIO

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Event, Incentive, OTPStore, Participation, Redemption, User

PNG_BYTES = b'\x89PNG\r\n\x1a\n' + b'\x00' * 64
STRONG_PASSWORD = 'GreenPalawan#2026'


def png_upload(name='id.png'):
    return SimpleUploadedFile(name, PNG_BYTES, content_type='image/png')


@override_settings(SUPABASE_URL='', SUPABASE_KEY='', SEMAPHORE_API_KEY='', SEMAPHORE_SENDER_NAME='', OTP_VERIFICATION_ENABLED=True,
                   PRIVATE_UPLOAD_DIR=tempfile.mkdtemp(prefix='eco-ids-'))
class BaseAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='kap_santamonica', password=STRONG_PASSWORD, email='admin@example.com',
            phone_number='+639170000001', role='admin', barangay='Santa Monica', is_verified=True)
        self.resident = User.objects.create_user(
            username='juan', password=STRONG_PASSWORD, email='juan@example.com',
            phone_number='+639170000002', role='resident', barangay='Santa Monica',
            is_verified=True, points=100)
        self.other_resident = User.objects.create_user(
            username='maria', password=STRONG_PASSWORD, email='maria@example.com',
            phone_number='+639170000003', role='resident', barangay='Santa Monica',
            is_verified=True, points=100)

    def as_user(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client


class DevBypassRemovedTests(BaseAPITest):

    def test_ai_endpoints_reject_bypass_header(self):
        for method, url in [('post', '/api/ai/chat/'), ('get', '/api/ai/tips/'),
                            ('get', '/api/ai/scheduling/'), ('get', '/api/ai/reminders/')]:
            response = getattr(self.client, method)(url, HTTP_X_DEV_BYPASS='DEV_BYPASS_TOKEN')
            self.assertEqual(response.status_code, 401, url)


class RoleEnforcementTests(BaseAPITest):

    def test_resident_blocked_from_admin_endpoints(self):
        client = self.as_user(self.resident)
        checks = [
            ('get', '/api/auth/users'),
            ('get', '/api/auth/users/export'),
            ('post', f'/api/auth/users/verify/{self.other_resident.id}'),
            ('post', f'/api/auth/users/{self.other_resident.id}/award-points'),
            ('get', '/api/events/global-logs'),
            ('post', '/api/events/'),
            ('get', '/api/finance/expenses'),
            ('post', '/api/incentives/'),
            ('get', '/api/auth/transfer/incoming'),
        ]
        for method, url in checks:
            response = getattr(client, method)(url, {}, format='json')
            self.assertEqual(response.status_code, 403, url)

    def test_resident_cannot_toggle_verification(self):
        self.as_user(self.resident).post(f'/api/auth/users/verify/{self.other_resident.id}')
        self.other_resident.refresh_from_db()
        self.assertTrue(self.other_resident.is_verified)

    def test_admin_portal_rejects_resident_at_login(self):
        response = self.client.post('/api/auth/login', {
            'username': 'juan', 'password': STRONG_PASSWORD, 'portal': 'admin'}, format='json')
        self.assertEqual(response.status_code, 403)


class LoginSecurityTests(BaseAPITest):

    def test_lockout_after_five_failures(self):
        for _ in range(5):
            self.client.post('/api/auth/login', {'username': 'juan', 'password': 'wrong'}, format='json')
        response = self.client.post('/api/auth/login', {
            'username': 'juan', 'password': STRONG_PASSWORD}, format='json')
        self.assertEqual(response.status_code, 429)

    def test_login_returns_refresh_token_that_works(self):
        response = self.client.post('/api/auth/login', {
            'username': 'juan', 'password': STRONG_PASSWORD, 'portal': 'resident'}, format='json')
        self.assertEqual(response.status_code, 200)
        refresh = self.client.post('/api/auth/token/refresh', {'refresh': response.data['refresh_token']},
                                   format='json')
        self.assertEqual(refresh.status_code, 200)
        self.assertIn('access', refresh.data)


def signup_code(email, code='246810'):
    OTPStore.objects.create(email=email, otp_code=code, purpose='signup')
    return code


class RegistrationValidationTests(BaseAPITest):

    def payload(self, **overrides):
        data = {'username': 'pedro', 'email': 'pedro@example.com', 'phone_number': '09171234567',
                'first_name': 'Pedro', 'last_name': 'Santos', 'password': STRONG_PASSWORD, 'barangay': 'Santa Monica', 'id_image': png_upload(),
                'otp_code': signup_code('pedro@example.com')}
        data.update(overrides)
        return data

    def test_valid_signup_normalizes_phone(self):
        response = self.client.post('/api/auth/register', self.payload(), format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(User.objects.get(username='pedro').phone_number, '+639171234567')

    def test_rejects_letters_in_phone(self):
        response = self.client.post('/api/auth/register', self.payload(phone_number='abc123'), format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_rejects_weak_password(self):
        response = self.client.post('/api/auth/register', self.payload(password='12345678'), format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_rejects_non_image_upload(self):
        fake = SimpleUploadedFile('id.png', b'<script>alert(1)</script>', content_type='image/png')
        response = self.client.post('/api/auth/register', self.payload(id_image=fake), format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_rejects_missing_id_for_residents(self):
        data = self.payload()
        data.pop('id_image')
        response = self.client.post('/api/auth/register', data, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_non_resident_role_is_refused(self):
        response = self.client.post('/api/auth/register', self.payload(role='superuser'), format='multipart')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username='pedro').exists())


class OTPTests(BaseAPITest):

    def test_expired_otp_rejected(self):
        otp = OTPStore.objects.create(email=self.resident.email, phone_number=self.resident.phone_number,
                                      otp_code='123456')
        OTPStore.objects.filter(pk=otp.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        response = self.client.post('/api/auth/reset-password', {
            'identifier': self.resident.email, 'otp_code': '123456', 'new_password': 'NewGreen#2026'},
            format='json')
        self.assertEqual(response.status_code, 400)

    def test_fresh_otp_works_with_phone_identifier(self):
        OTPStore.objects.create(email=self.resident.email, phone_number=self.resident.phone_number,
                                otp_code='654321')
        response = self.client.post('/api/auth/reset-password', {
            'identifier': '09170000002', 'otp_code': '654321', 'new_password': 'NewGreen#2026'},
            format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.check_password('NewGreen#2026'))


@override_settings(SEMAPHORE_API_KEY='test-key')
class SignupCodeTests(BaseAPITest):

    details = {'username': 'pedro', 'email': 'Pedro@Example.com', 'phone_number': '09171234567'}

    def register(self, code):
        return self.client.post('/api/auth/register', {
            **self.details, 'first_name': 'Pedro', 'last_name': 'Santos', 'password': STRONG_PASSWORD, 'barangay': 'Santa Monica',
            'id_image': png_upload(), 'otp_code': code}, format='multipart')

    def test_code_is_texted_and_creates_account(self):
        from unittest import mock
        from django.core import mail
        with mock.patch('api.views_auth.requests.post', return_value=semaphore_reply()) as post:
            response = self.client.post('/api/auth/register/send-code', self.details, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(mail.outbox), 0)
        code = OTPStore.objects.get(email='pedro@example.com', purpose='signup', is_used=False).otp_code
        self.assertEqual(post.call_args.kwargs['data']['code'], code)

        verify = self.client.post('/api/auth/register/verify-code', {'email': 'pedro@example.com', 'otp_code': code}, format='json')
        self.assertEqual(verify.status_code, 200)
        self.assertEqual(self.register(code).status_code, 201)
        self.assertTrue(OTPStore.objects.get(otp_code=code).is_used)

    def test_register_without_valid_code_fails(self):
        self.assertEqual(self.register('').status_code, 400)
        self.assertEqual(self.register('000000').status_code, 400)
        self.assertFalse(User.objects.filter(username='pedro').exists())

    def test_password_reset_code_cannot_create_account(self):
        OTPStore.objects.create(email='pedro@example.com', otp_code='135791', purpose='reset')
        self.assertEqual(self.register('135791').status_code, 400)

    def test_expired_code_rejected(self):
        code = signup_code('pedro@example.com')
        OTPStore.objects.filter(otp_code=code).update(created_at=timezone.now() - timedelta(minutes=11))
        self.assertEqual(self.register(code).status_code, 400)

    def test_send_code_rejects_taken_email(self):
        response = self.client.post('/api/auth/register/send-code', {**self.details, 'email': self.resident.email}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(OTPStore.objects.filter(purpose='signup').exists())


def semaphore_reply(ok=True):
    from unittest import mock
    reply = mock.Mock(ok=ok, status_code=200 if ok else 401)
    reply.json.return_value = [{'message_id': 1234, 'status': 'Pending'}] if ok else {'apikey': ['Invalid API key']}
    return reply


@override_settings(SEMAPHORE_API_KEY='test-key', SEMAPHORE_SENDER_NAME='EcoConnect')
class SmsCodeTests(BaseAPITest):

    details = {'username': 'pedro', 'email': 'pedro@example.com', 'phone_number': '+63 917 123 4567'}

    def test_signup_code_is_texted_to_phone(self):
        from unittest import mock
        from django.core import mail
        with mock.patch('api.views_auth.requests.post', return_value=semaphore_reply()) as post:
            response = self.client.post('/api/auth/register/send-code', self.details, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual((response.data['channel'], response.data['sent_to']), ('sms', '0917****567'))
        self.assertEqual(len(mail.outbox), 0)
        sent = post.call_args.kwargs['data']
        code = OTPStore.objects.get(email='pedro@example.com', purpose='signup', is_used=False).otp_code
        self.assertEqual((sent['number'], sent['code'], sent['sendername'], sent['apikey']),
                         ('09171234567', code, 'EcoConnect', 'test-key'))
        self.assertIn('{otp}', sent['message'])

    def test_reset_code_is_texted_and_works(self):
        from unittest import mock
        with mock.patch('api.views_auth.requests.post', return_value=semaphore_reply()) as post:
            response = self.client.post('/api/auth/forgot-password', {'identifier': '09170000002'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['channel'], 'sms')
        code = post.call_args.kwargs['data']['code']
        verify = self.client.post('/api/auth/verify-otp', {'identifier': '09170000002', 'otp_code': code}, format='json')
        self.assertEqual(verify.status_code, 200)

    def test_failed_sms_is_reported_and_never_emailed(self):
        from unittest import mock
        from django.core import mail
        with mock.patch('api.views_auth.requests.post', return_value=semaphore_reply(ok=False)):
            response = self.client.post('/api/auth/register/send-code', self.details, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(len(mail.outbox), 0)

    def test_unapproved_sender_name_retries_with_default_sender(self):
        from unittest import mock
        rejected = mock.Mock(ok=False, status_code=400)
        rejected.json.return_value = {'sendername': ['The selected sendername is invalid.']}
        with mock.patch('api.views_auth.requests.post', side_effect=[rejected, semaphore_reply()]) as post:
            response = self.client.post('/api/auth/register/send-code', self.details, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(post.call_count, 2)
        self.assertNotIn('sendername', post.call_args.kwargs['data'])

    def test_resend_waits_a_minute(self):
        from unittest import mock
        with mock.patch('api.views_auth.requests.post', return_value=semaphore_reply()) as post:
            first = self.client.post('/api/auth/register/send-code', self.details, format='json')
            second = self.client.post('/api/auth/register/send-code', self.details, format='json')
        self.assertEqual((first.status_code, second.status_code), (200, 429))
        self.assertEqual(post.call_count, 1)


@override_settings(OTP_VERIFICATION_ENABLED=False)
class OtpSwitchedOffTests(BaseAPITest):

    details = {'username': 'pedro', 'email': 'pedro@example.com', 'phone_number': '09171234567'}

    def test_signup_skips_the_code(self):
        from unittest import mock
        with mock.patch('api.views_auth.requests.post') as post:
            check = self.client.post('/api/auth/register/send-code', self.details, format='json')
        self.assertEqual(check.status_code, 200)
        self.assertFalse(check.data['verification_required'])
        post.assert_not_called()
        response = self.client.post('/api/auth/register', {
            **self.details, 'first_name': 'Pedro', 'last_name': 'Santos', 'password': STRONG_PASSWORD, 'barangay': 'Santa Monica', 'id_image': png_upload()}, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)

    def test_signup_still_checks_duplicates(self):
        check = self.client.post('/api/auth/register/send-code', {**self.details, 'email': self.resident.email}, format='json')
        self.assertEqual(check.status_code, 400)

    def test_forgot_password_is_paused(self):
        response = self.client.post('/api/auth/forgot-password', {'identifier': '09170000002'}, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertFalse(OTPStore.objects.exists())


class NamesAndPrivacyTests(BaseAPITest):

    def outsider(self):
        return User.objects.create_user(username='lito', password=STRONG_PASSWORD, email='lito@example.com',
                                        phone_number='+639170000009', role='resident', barangay='Tiniguiban')

    def test_signup_requires_and_saves_names(self):
        base = {'username': 'pedro', 'email': 'pedro@example.com', 'phone_number': '09171234567',
                'password': STRONG_PASSWORD, 'barangay': 'Santa Monica', 'id_image': png_upload(),
                'otp_code': signup_code('pedro@example.com')}
        missing = self.client.post('/api/auth/register', {**base, 'last_name': 'Santos'}, format='multipart')
        self.assertEqual(missing.status_code, 400)
        self.assertIn('First name', missing.data['message'])
        bad = self.client.post('/api/auth/register', {**base, 'id_image': png_upload(), 'first_name': 'P3dro', 'last_name': 'Santos'}, format='multipart')
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post('/api/auth/register', {**base, 'id_image': png_upload(), 'first_name': '  María  Luz ',
                                                     'last_name': "Dela Cruz-O'Neil"}, format='multipart')
        self.assertEqual(ok.status_code, 201, ok.data)
        pedro = User.objects.get(username='pedro')
        self.assertEqual(pedro.full_name, "María Luz Dela Cruz-O'Neil")

    def test_names_in_api_and_short_on_leaderboard(self):
        self.resident.first_name, self.resident.last_name = 'Juan', 'Dela Cruz'
        self.resident.save()
        me = self.as_user(self.resident).get('/api/auth/me')
        self.assertEqual(me.data['full_name'], 'Juan Dela Cruz')
        board = self.as_user(self.resident).get('/api/events/leaderboard')
        self.assertIn('Juan D.', [row['full_name'] for row in board.data])

    def test_profile_can_set_names(self):
        response = self.as_user(self.resident).post('/api/auth/profile/update', {'first_name': 'Juan', 'last_name': 'Reyes'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['full_name'], 'Juan Reyes')
        empty = self.as_user(self.resident).post('/api/auth/profile/update', {'first_name': ' '})
        self.assertEqual(empty.status_code, 400)

    def test_officials_cannot_see_other_barangays(self):
        lito = self.outsider()
        self.assertEqual(self.as_user(self.admin).get('/api/auth/users/search?query=lito').status_code, 404)
        listed = self.as_user(self.admin).get('/api/auth/users')
        self.assertNotIn(lito.id, [u['id'] for u in listed.data])

    def test_officials_cannot_pull_in_residents_from_other_barangays(self):
        lito = self.outsider()
        response = self.as_user(self.admin).post(f'/api/auth/users/transfer/{lito.id}', {'new_barangay': 'Santa Monica'}, format='json')
        self.assertEqual(response.status_code, 403)
        lito.refresh_from_db()
        self.assertEqual(lito.barangay, 'Tiniguiban')
        moved = self.as_user(self.admin).post(f'/api/auth/users/transfer/{self.resident.id}', {'new_barangay': 'Tiniguiban'}, format='json')
        self.assertEqual(moved.status_code, 200)


class RedemptionTests(BaseAPITest):

    def setUp(self):
        super().setUp()
        self.item = Incentive.objects.create(barangay='Santa Monica', name='Rice 1kg', points_cost=50, stock=1)

    def test_last_item_can_only_be_redeemed_once(self):
        first = self.as_user(self.resident).post('/api/finance/redemption/request',
                                                 {'incentive_id': self.item.id}, format='json')
        second = self.as_user(self.other_resident).post('/api/finance/redemption/request',
                                                        {'incentive_id': self.item.id}, format='json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 0)

    def test_client_cannot_choose_price(self):
        self.as_user(self.resident).post('/api/finance/redemption/request',
                                         {'incentive_id': self.item.id, 'points_spent': -500}, format='json')
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.points, 50)

    def test_reject_refunds_points_and_stock(self):
        self.as_user(self.resident).post('/api/finance/redemption/request',
                                         {'incentive_id': self.item.id}, format='json')
        redemption = Redemption.objects.get(user=self.resident)
        response = self.as_user(self.admin).post(f'/api/finance/redemption/reject/{redemption.id}')
        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual((self.resident.points, self.item.stock), (100, 1))


class AttendanceTests(BaseAPITest):

    def test_double_verification_awards_once(self):
        event = Event.objects.create(title='Coastal Cleanup', description='Bring gloves', location='Beach',
                                     date='2099-01-01', time='08:00', organizer=self.admin,
                                     points_reward=20, barangay='Santa Monica')
        participation = Participation.objects.create(user=self.resident, event=event)
        client = self.as_user(self.admin)
        client.post(f'/api/events/verify/{participation.id}')
        client.post(f'/api/events/verify/{participation.id}')
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.points, 120)


class EventValidationTests(BaseAPITest):

    def event(self, **overrides):
        data = {'title': 'Tree Planting', 'description': 'Plant mangroves', 'location': 'Bay',
                'date': (timezone.now().date() + timedelta(days=3)).isoformat(), 'time': '07:00',
                'points_reward': 20, 'category': 'Tree Planting'}
        data.update(overrides)
        return self.as_user(self.admin).post('/api/events/', data, format='json')

    def test_valid_event_is_forced_into_admins_barangay(self):
        response = self.event(barangay='Some Other Barangay')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['barangay'], 'Santa Monica')

    def test_rejects_zero_points_past_date_and_long_text(self):
        self.assertEqual(self.event(points_reward=0).status_code, 400)
        self.assertEqual(self.event(date='2000-01-01').status_code, 400)
        self.assertEqual(self.event(description='x' * 10_000).status_code, 400)


class PrivacyTests(BaseAPITest):

    def test_leaderboard_hides_pii(self):
        response = self.client.get('/api/events/leaderboard?barangay=Santa Monica')
        self.assertEqual(response.status_code, 200)
        for row in response.data:
            self.assertNotIn('phone_number', row)
            self.assertNotIn('email', row)
            self.assertNotIn('id_image', row)


class PaginationTests(BaseAPITest):

    def test_users_endpoint_paginates(self):
        response = self.as_user(self.admin).get('/api/auth/users?page=1&page_size=2')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(len(response.data['results']), 2)

    def test_plain_list_reports_total_header(self):
        response = self.as_user(self.admin).get('/api/auth/users')
        self.assertEqual(response['X-Total-Count'], '3')


class GeminiChatTests(BaseAPITest):

    def chat(self, payload):
        return self.as_user(self.resident).post('/api/ai/chat/', payload, format='json')

    def test_fallback_without_api_key(self):
        from unittest import mock
        with mock.patch.dict('os.environ', {'GEMINI_API_KEY': ''}):
            response = self.chat({'message': 'How many points do I have?'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['source'], 'fallback')
        self.assertIn('100', response.data['response'])

    def test_uses_gemini_with_context_and_history(self):
        from unittest import mock
        fake_client = mock.Mock()
        fake_client.models.generate_content.return_value = mock.Mock(text='Join the coastal cleanup!')
        with mock.patch('api.views_ai.get_gemini_client', return_value=fake_client):
            response = self.chat({'message': 'What can I do this week?',
                                  'history': [{'role': 'user', 'content': 'hi'},
                                              {'role': 'assistant', 'content': 'Hello!'}]})
        self.assertEqual(response.data, {'response': 'Join the coastal cleanup!', 'source': 'gemini'})
        kwargs = fake_client.models.generate_content.call_args.kwargs
        self.assertEqual(len(kwargs['contents']), 3)
        self.assertIn('Santa Monica', kwargs['config'].system_instruction)
        self.assertIn('Eco-Points: 100', kwargs['config'].system_instruction)

    def test_gemini_error_falls_back(self):
        from unittest import mock
        fake_client = mock.Mock()
        fake_client.models.generate_content.side_effect = RuntimeError('quota exceeded')
        with mock.patch('api.views_ai.get_gemini_client', return_value=fake_client):
            response = self.chat({'message': 'recycling tips?'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['source'], 'fallback')

    def test_timeout_meets_google_minimum(self):
        from . import views_ai
        self.assertGreaterEqual(views_ai.GEMINI_TIMEOUT_MS, 10_000)


class RewardQuantityTests(BaseAPITest):

    def setUp(self):
        super().setUp()
        self.item = Incentive.objects.create(barangay='Santa Monica', name='Load 10', points_cost=20, stock=5, max_per_claim=3)

    def redeem(self, quantity):
        return self.as_user(self.resident).post('/api/finance/redemption/request',
                                                {'incentive_id': self.item.id, 'quantity': quantity}, format='json')

    def test_quantity_charges_and_restocks(self):
        response = self.redeem(3)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['quantity'], 3)
        self.resident.refresh_from_db(); self.item.refresh_from_db()
        self.assertEqual((self.resident.points, self.item.stock), (40, 2))
        self.as_user(self.admin).post(f"/api/finance/redemption/reject/{response.data['id']}")
        self.resident.refresh_from_db(); self.item.refresh_from_db()
        self.assertEqual((self.resident.points, self.item.stock), (100, 5))

    def test_over_max_per_claim_rejected(self):
        self.assertEqual(self.redeem(4).status_code, 400)

    def test_cannot_exceed_stock_or_go_below_one(self):
        Incentive.objects.filter(pk=self.item.pk).update(stock=2)
        self.assertEqual(self.redeem(3).status_code, 400)
        self.assertEqual(self.redeem(0).status_code, 400)

    def test_admin_sets_max_per_claim(self):
        response = self.as_user(self.admin).put(f'/api/incentives/{self.item.id}', {'max_per_claim': 5}, format='json')
        self.assertEqual(response.data['max_per_claim'], 5)


class TitleTests(BaseAPITest):

    def test_title_follows_points(self):
        User.objects.filter(pk=self.resident.pk).update(points=320, title='Budol ng Kalikasan')
        self.resident.refresh_from_db()
        response = self.as_user(self.resident).get('/api/auth/me')
        self.assertEqual(response.data['title'], 'Lodi ng Lupa')

    def test_spending_points_keeps_title(self):
        item = Incentive.objects.create(barangay='Santa Monica', name='Rice 1kg', points_cost=95, stock=5, max_per_claim=1)
        response = self.as_user(self.resident).post('/api/finance/redemption/request',
                                                    {'incentive_id': item.id, 'quantity': 1}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.resident.refresh_from_db()
        me = self.as_user(self.resident).get('/api/auth/me').data
        self.assertEqual((me['points'], me['peak_points'], me['title']), (5, 100, 'Beterano sa Damo'))

    def test_award_raises_peak(self):
        response = self.as_user(self.admin).post(f'/api/auth/users/{self.resident.id}/award-points', {'points': 50}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.resident.refresh_from_db()
        self.assertEqual((self.resident.peak_points, self.resident.title), (150, 'Super Tropikal'))


class PrivateIdImageTests(BaseAPITest):

    def setUp(self):
        super().setUp()
        response = self.client.post('/api/auth/register', {
            'username': 'pedro', 'email': 'pedro@example.com', 'phone_number': '09171234567',
            'first_name': 'Pedro', 'last_name': 'Santos', 'password': STRONG_PASSWORD, 'barangay': 'Santa Monica', 'id_image': png_upload(),
            'otp_code': signup_code('pedro@example.com')}, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.pedro = User.objects.get(username='pedro')

    def test_id_saved_privately_and_not_exposed(self):
        self.assertTrue(self.pedro.id_image.startswith('private:local:'))
        me = self.as_user(self.pedro).get('/api/auth/me').data
        self.assertNotIn('id_image', me)
        self.assertTrue(me['has_id_image'])

    def test_owner_and_same_barangay_official_can_view(self):
        for viewer in (self.pedro, self.admin):
            response = self.as_user(viewer).get(f'/api/auth/users/{self.pedro.id}/id-image')
            self.assertEqual(response.status_code, 200)
            image = self.client.get(response.data['url'])
            self.assertEqual(image.status_code, 200)
            self.assertEqual(image['Content-Type'], 'image/png')
            self.assertIn('no-store', image['Cache-Control'])

    def test_others_cannot_view(self):
        outsider_admin = User.objects.create_user(
            username='kap_sanjose', password=STRONG_PASSWORD, email='sj@example.com',
            phone_number='+639170000009', role='admin', barangay='San Jose', is_verified=True)
        for viewer in (self.other_resident, outsider_admin):
            response = self.as_user(viewer).get(f'/api/auth/users/{self.pedro.id}/id-image')
            self.assertEqual(response.status_code, 403)

    def test_tampered_or_expired_link_rejected(self):
        url = self.as_user(self.pedro).get(f'/api/auth/users/{self.pedro.id}/id-image').data['url']
        self.assertEqual(self.client.get(url + 'x').status_code, 404)
        with override_settings(ID_LINK_SECONDS=-1):
            self.assertEqual(self.client.get(url).status_code, 404)

    def test_static_uploads_folder_not_used_for_ids(self):
        self.assertNotIn('static/uploads', self.pedro.id_image)


class OfficialAccountTests(BaseAPITest):

    def test_public_signup_cannot_create_official(self):
        response = self.client.post('/api/auth/register', {
            'username': 'fake.kap', 'email': 'fake@example.com', 'phone_number': '09179990000',
            'first_name': 'Pedro', 'last_name': 'Santos', 'password': STRONG_PASSWORD, 'barangay': 'Santa Monica', 'role': 'admin'}, format='multipart')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username='fake.kap').exists())

    def test_create_official_command(self):
        from django.core.management import call_command
        call_command('create_official', username='kap.sanjose', first_name='Jose', last_name='Rizal', email='sj@example.com', phone='09175550000',
                     barangay='San Jose', password=STRONG_PASSWORD, stdout=__import__('io').StringIO())
        official = User.objects.get(username='kap.sanjose')
        self.assertEqual((official.role, official.barangay, official.is_verified, official.phone_number),
                         ('admin', 'San Jose', True, '+639175550000'))

    def test_admin_add_form_creates_verified_official(self):
        from .admin import EcoUserCreationForm
        form = EcoUserCreationForm(data={
            'username': 'kap.tiniguiban', 'email': 't@example.com', 'phone_number': '09176660000',
            'role': 'admin', 'barangay': 'Tiniguiban', 'password1': STRONG_PASSWORD, 'password2': STRONG_PASSWORD})
        self.assertTrue(form.is_valid(), form.errors)
        official = form.save()
        self.assertTrue(official.is_verified)
        self.assertTrue(official.check_password(STRONG_PASSWORD))


class ReplaceIdTests(BaseAPITest):

    def test_new_id_requires_verification_again(self):
        response = self.as_user(self.resident).post('/api/auth/profile/id-image', {'id_image': png_upload()}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.resident.refresh_from_db()
        self.assertFalse(self.resident.is_verified)
        self.assertTrue(self.resident.id_image.startswith('private:local:'))
        self.assertFalse(response.data['user']['is_verified'])

    def test_old_private_id_is_deleted(self):
        import os
        from django.conf import settings
        client = self.as_user(self.resident)
        client.post('/api/auth/profile/id-image', {'id_image': png_upload()}, format='multipart')
        self.resident.refresh_from_db()
        first = os.path.join(settings.PRIVATE_UPLOAD_DIR, self.resident.id_image.split(':', 2)[2])
        self.assertTrue(os.path.isfile(first))
        client.post('/api/auth/profile/id-image', {'id_image': png_upload('second.png')}, format='multipart')
        self.assertFalse(os.path.isfile(first))

    def test_non_image_rejected_and_officials_blocked(self):
        fake = SimpleUploadedFile('id.png', b'not an image', content_type='image/png')
        self.assertEqual(self.as_user(self.resident).post('/api/auth/profile/id-image', {'id_image': fake}, format='multipart').status_code, 400)
        self.assertEqual(self.as_user(self.admin).post('/api/auth/profile/id-image', {'id_image': png_upload()}, format='multipart').status_code, 400)


class ProfileHistoryAndLeaderboardTests(BaseAPITest):
    def test_my_point_awards(self):
        self.as_user(self.admin).post(f'/api/auth/users/{self.resident.id}/award-points', {'points': 15, 'reason': 'Helped at cleanup'}, format='json')
        awards = self.as_user(self.resident).get('/api/auth/me/point-awards').data
        self.assertEqual([(a['points'], a['reason']) for a in awards], [(15, 'Helped at cleanup')])

    def test_leaderboard_is_own_barangay_only(self):
        User.objects.create_user(username='outsider', password=STRONG_PASSWORD, email='o@example.com',
                                 phone_number='+639170000099', barangay='San Jose', points=999)
        names = [u['username'] for u in self.as_user(self.resident).get('/api/events/leaderboard?barangay=All').data]
        self.assertNotIn('outsider', names)


class PasswordStorageTests(BaseAPITest):

    def test_admin_edit_form_cannot_store_plain_password(self):
        from .admin import EcoUserChangeForm
        self.assertNotIn('password', EcoUserChangeForm().fields.keys() - {'password'})
        self.assertTrue(EcoUserChangeForm().fields['password'].disabled)

    def test_model_hashes_plain_text_password(self):
        User.objects.filter(pk=self.admin.pk).update(password='plain-Text#Pass1')
        self.admin.refresh_from_db()
        self.admin.save()
        self.admin.refresh_from_db()
        self.assertNotEqual(self.admin.password, 'plain-Text#Pass1')
        self.assertTrue(self.admin.check_password('plain-Text#Pass1'))

    def test_repair_migration_fixes_existing_accounts(self):
        import importlib
        from django.apps import apps as django_apps
        User.objects.filter(pk=self.admin.pk).update(password='plain-Text#Pass1')
        migration = importlib.import_module('api.migrations.0006_hash_plaintext_passwords')
        migration.hash_plaintext_passwords(django_apps, None)
        response = self.client.post('/api/auth/login', {
            'username': self.admin.username, 'password': 'plain-Text#Pass1', 'portal': 'admin'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.check_password(STRONG_PASSWORD))


class EventTicketTests(BaseAPITest):

    def setUp(self):
        super().setUp()
        self.event = self.make_event('Coastal Cleanup', days=1)

    def make_event(self, title, days=1, **extra):
        return Event.objects.create(title=title, description='x', location='9.74,118.73',
                                    date=(timezone.now().date() + timedelta(days=days)).isoformat(), time='07:00',
                                    organizer=self.admin, points_reward=25, barangay='Santa Monica', **extra)

    def join(self, user, event=None):
        return self.as_user(user).post(f'/api/events/join/{(event or self.event).id}')

    def ticket(self, user, event=None):
        return self.as_user(user).get(f'/api/events/{(event or self.event).id}/ticket').data

    def scan(self, event=None, **payload):
        return self.as_user(self.admin).post(f'/api/events/{(event or self.event).id}/check-in', payload, format='json')

    def test_join_gives_ticket_and_scan_checks_in_once(self):
        self.assertEqual(self.join(self.resident).status_code, 201)
        ticket = self.ticket(self.resident)
        self.assertTrue(ticket['token'].startswith('ECO2:'))
        self.assertRegex(ticket['code'], r'^[A-Z2-9]{4}-[A-Z2-9]{4}$')
        first = self.scan(token=ticket['token'])
        self.assertEqual((first.status_code, first.data['result']), (200, 'checked_in'))
        self.assertEqual(self.scan(token=ticket['token']).data['result'], 'already')
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.points, 125)

    def test_typed_code_works(self):
        self.join(self.resident)
        code = self.ticket(self.resident)['code'].lower()
        response = self.scan(code=code)
        self.assertEqual(response.data['result'], 'checked_in')
        self.assertEqual(Participation.objects.get(user=self.resident, event=self.event).checkin_method, 'code')

    def test_ticket_for_another_event_rejected(self):
        other = self.make_event('Mangrove Planting', days=5)
        self.join(self.resident, other)
        response = self.scan(token=self.ticket(self.resident, other)['token'])
        self.assertEqual(response.data['result'], 'other_event')
        self.assertIn('Mangrove Planting', response.data['message'])

    def test_leaving_cancels_ticket_and_forgery_rejected(self):
        self.join(self.resident)
        token = self.ticket(self.resident)['token']
        self.as_user(self.resident).delete(f'/api/events/leave/{self.event.id}')
        self.assertEqual(self.scan(token=token).data['result'], 'invalid')
        self.assertEqual(self.scan(token=token[:-2] + 'xx').data['result'], 'invalid')
        self.assertEqual(self.scan(code='AAAA-AAAA').data['result'], 'invalid')

    def test_no_ticket_without_joining(self):
        response = self.as_user(self.resident).get(f'/api/events/{self.event.id}/ticket')
        self.assertEqual(response.status_code, 404)

    def test_residents_cannot_scan(self):
        self.join(self.resident)
        response = self.as_user(self.other_resident).post(f'/api/events/{self.event.id}/check-in',
                                                          {'token': self.ticket(self.resident)['token']}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_attendance_excel_report(self):
        import openpyxl
        self.join(self.resident)
        self.join(self.other_resident)
        self.scan(token=self.ticket(self.other_resident)['token'])
        response = self.as_user(self.admin).get(f'/api/events/{self.event.id}/participants/export')
        book = openpyxl.load_workbook(BytesIO(response.content))
        self.assertEqual(book.sheetnames, ['Summary', 'Attendees', 'Did not attend'])
        attendees = list(book['Attendees'].values)
        self.assertEqual((attendees[1][1], attendees[1][6], attendees[1][7]), ('maria', 'QR scan', 25))
        self.assertNotIn('Walk-in', attendees[0])
        self.assertEqual(list(book['Did not attend'].values)[1][1], 'juan')
        summary = dict(list(book['Summary'].values)[1:])
        self.assertEqual((summary['Registered (total)'], summary['Attended'], summary['Total points awarded']), (2, 1, 25))


class ParticipantLimitTests(BaseAPITest):

    def setUp(self):
        super().setUp()
        self.event = Event.objects.create(title='Small drive', description='x', location='9.74,118.73',
                                          date=(timezone.now().date() + timedelta(days=2)).isoformat(), time='07:00',
                                          organizer=self.admin, points_reward=10, barangay='Santa Monica', max_participants=1)

    def test_full_event_rejects_more_joins(self):
        self.assertEqual(self.as_user(self.resident).post(f'/api/events/join/{self.event.id}').status_code, 201)
        response = self.as_user(self.other_resident).post(f'/api/events/join/{self.event.id}')
        self.assertEqual((response.status_code, response.data['message']), (400, 'This event is full'))

    def test_leaving_frees_a_spot(self):
        self.as_user(self.resident).post(f'/api/events/join/{self.event.id}')
        self.as_user(self.resident).delete(f'/api/events/leave/{self.event.id}')
        self.assertEqual(self.as_user(self.other_resident).post(f'/api/events/join/{self.event.id}').status_code, 201)

    def test_events_list_shows_count_and_limit(self):
        self.as_user(self.resident).post(f'/api/events/join/{self.event.id}')
        row = self.as_user(self.resident).get('/api/events/').data[0]
        self.assertEqual((row['participants_count'], row['max_participants']), (1, 1))

    def test_create_with_limit_and_lowering_rules(self):
        data = {'title': 'Big drive', 'description': 'x', 'location': '9.7,118.7', 'time': '07:00', 'points_reward': 10,
                'category': 'Tree Planting', 'date': (timezone.now().date() + timedelta(days=3)).isoformat(), 'max_participants': 30}
        created = self.as_user(self.admin).post('/api/events/', data, format='json')
        self.assertEqual(created.data['max_participants'], 30)
        unlimited = self.as_user(self.admin).post('/api/events/', {**data, 'max_participants': ''}, format='json')
        self.assertIsNone(unlimited.data['max_participants'])
        self.as_user(self.resident).post(f'/api/events/join/{self.event.id}')
        response = self.as_user(self.admin).put(f'/api/events/{self.event.id}', {'max_participants': 0}, format='json')
        self.assertIsNone(response.data['max_participants'])


class FinishEventTests(BaseAPITest):

    def setUp(self):
        super().setUp()
        self.event = Event.objects.create(title='Drive', description='x', location='9.74,118.73',
                                          date=(timezone.now().date() + timedelta(days=1)).isoformat(), time='07:00',
                                          organizer=self.admin, points_reward=20, barangay='Santa Monica')
        self.as_user(self.resident).post(f'/api/events/join/{self.event.id}')

    def finish(self, action='finish', user=None):
        return self.as_user(user or self.admin).post(f'/api/events/{self.event.id}/status', {'action': action}, format='json')

    def test_finished_event_is_locked(self):
        response = self.finish()
        self.assertEqual((response.status_code, response.data['event']['status']), (200, 'completed'))
        join = self.as_user(self.other_resident).post(f'/api/events/join/{self.event.id}')
        self.assertEqual(join.status_code, 400)
        leave = self.as_user(self.resident).delete(f'/api/events/leave/{self.event.id}')
        self.assertEqual(leave.status_code, 400)
        token = self.as_user(self.resident).get(f'/api/events/{self.event.id}/ticket').data['token']
        scan = self.as_user(self.admin).post(f'/api/events/{self.event.id}/check-in', {'token': token}, format='json')
        self.assertEqual(scan.data['result'], 'finished')
        p = Participation.objects.get(user=self.resident, event=self.event)
        self.assertEqual(self.as_user(self.admin).post(f'/api/events/verify/{p.id}').status_code, 400)

    def test_reopen_allows_joining_again(self):
        self.finish()
        self.assertEqual(self.finish('reopen').data['event']['status'], 'upcoming')
        self.assertEqual(self.as_user(self.other_resident).post(f'/api/events/join/{self.event.id}').status_code, 201)

    def test_only_officials_can_finish(self):
        self.assertEqual(self.finish(user=self.resident).status_code, 403)
        self.assertEqual(self.finish(action='explode').status_code, 400)


class StatisticsReportTests(BaseAPITest):

    def setUp(self):
        super().setUp()
        self.old = Event.objects.create(title='Old drive', description='x', location='9.74,118.73', date='2026-01-10',
                                        time='07:00', organizer=self.admin, barangay='Santa Monica', points_reward=10)
        self.new = Event.objects.create(title='New drive', description='x', location='9.74,118.73', date='2026-06-10',
                                        time='07:00', organizer=self.admin, barangay='Santa Monica', points_reward=20)
        Event.objects.create(title='Other barangay', description='x', location='9.7,118.7', date='2026-06-10',
                             time='07:00', organizer=self.admin, barangay='San Jose', points_reward=5)
        Participation.objects.create(user=self.resident, event=self.new, status='attended')

    def workbook(self, query=''):
        import openpyxl
        from io import BytesIO
        response = self.as_user(self.admin).get(f'/api/reports/statistics{query}')
        self.assertEqual(response.status_code, 200)
        return openpyxl.load_workbook(BytesIO(response.content))

    def summary(self, book):
        return {row[0]: row[1] for row in book['Summary'].iter_rows(min_row=2, values_only=True) if row[0]}

    def test_overall_report_has_every_section(self):
        book = self.workbook()
        self.assertEqual(book.sheetnames, ['Summary', 'Event categories', 'Events', 'Attendance', 'New residents',
                                           'Bonus points', 'Reward claims', 'Rewards catalog', 'Transfers', 'Leaderboard'])
        summary = self.summary(book)
        self.assertEqual(summary['Period'], 'Overall (since the system started)')
        self.assertEqual(summary['Events in period'], 2)
        self.assertEqual(summary['Points earned from events'], 20)

    def test_date_range_filters_events(self):
        summary = self.summary(self.workbook('?start=2026-01-01&end=2026-01-31'))
        self.assertEqual(summary['Period'], '2026-01-01 to 2026-01-31')
        self.assertEqual((summary['Events in period'], summary['Attended']), (1, 0))

    def test_bad_range_rejected(self):
        response = self.as_user(self.admin).get('/api/reports/statistics?start=2026-05-01&end=2026-01-01')
        self.assertEqual(response.status_code, 400)

    def test_residents_cannot_download(self):
        self.assertEqual(self.as_user(self.resident).get('/api/reports/statistics').status_code, 403)
