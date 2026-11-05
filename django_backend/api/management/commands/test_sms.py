import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.validators import ValidationError, normalize_ph_phone
from api.views_auth import clean_setting, send_sms_otp


class Command(BaseCommand):
    help = "Check the Semaphore account and send a test code, e.g. python manage.py test_sms 09171234567"

    def add_arguments(self, parser):
        parser.add_argument('number', nargs='?', help='PH mobile number to send a test code to')

    def handle(self, *args, **options):
        key = clean_setting(settings.SEMAPHORE_API_KEY)
        if not key:
            raise CommandError("SEMAPHORE_API_KEY is empty on this server.")
        self.stdout.write(f"API key: {key[:4]}...{key[-4:]} ({len(key)} characters)")
        self.stdout.write(f"Sender name: {clean_setting(settings.SEMAPHORE_SENDER_NAME) or '(Semaphore default)'}")

        try:
            account = requests.get('https://api.semaphore.co/api/v4/account', params={'apikey': key}, timeout=15)
            self.stdout.write(f"Account check ({account.status_code}): {account.text[:300]}")
        except requests.RequestException as exc:
            self.stdout.write(self.style.ERROR(f"Could not reach Semaphore: {exc}"))

        if not options['number']:
            return
        try:
            number = normalize_ph_phone(options['number'])
        except ValidationError as exc:
            raise CommandError(str(exc))
        sent, detail = send_sms_otp(number, '123456', 'signup')
        style = self.style.SUCCESS if sent else self.style.ERROR
        self.stdout.write(style(f"Test SMS: {detail}"))
