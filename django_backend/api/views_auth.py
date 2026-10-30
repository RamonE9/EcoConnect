import io
import logging
import secrets
from datetime import timedelta

import pandas as pd
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import models, transaction
from django.db.models import F
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OTPStore, PointAward, User, compute_title
from .pagination import paginated_response
from .permissions import ALLOWED_SIGNUP_ROLES, IsBarangayAdmin, is_admin
from .serializers import OfficialContactSerializer, PointAwardSerializer, UserSerializer
from .storage_utils import upload_image_file, validate_image_upload
from .validators import (
    ValidationError, clean_email, clean_int, clean_text, clean_username, normalize_ph_phone,
)

logger = logging.getLogger(__name__)

MAX_AWARD_POINTS = 500


def bad_request(message):
    return Response({"message": message}, status=status.HTTP_400_BAD_REQUEST)


def password_errors(password, user=None):
    """Run Django's password validators; return a message or None."""
    try:
        validate_password(password, user=user)
        return None
    except DjangoValidationError as exc:
        return ' '.join(exc.messages)


def client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR', '')


def index(request, path=''):
    return render(request, 'index.html')


# ─── Registration & login ─────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def register(request):
    data = request.data
    try:
        username = clean_username(data.get('username'))
        email = clean_email(data.get('email'))
        phone_number = normalize_ph_phone(data.get('phone_number'))
        barangay = clean_text(data.get('barangay'), 'Barangay', 50)
    except ValidationError as exc:
        return bad_request(str(exc))

    # Only known roles may be requested; anything else becomes a resident.
    role = data.get('role', 'resident')
    if role not in ALLOWED_SIGNUP_ROLES:
        role = 'resident'

    password = data.get('password') or ''
    error = password_errors(password, User(username=username, email=email))
    if error:
        return bad_request(error)

    if User.objects.filter(email__iexact=email).exists():
        return bad_request("Email already registered")
    if User.objects.filter(username__iexact=username).exists():
        return bad_request("Username already exists")
    if User.objects.filter(phone_number=phone_number).exists():
        return bad_request("Phone number already registered")

    id_file = request.FILES.get('id_image')
    if role == 'resident' and not id_file:
        return bad_request("Please upload a photo of your Barangay ID for verification.")
    if id_file:
        try:
            validate_image_upload(id_file)
        except ValidationError as exc:
            return bad_request(str(exc))

    id_image_path = None
    if id_file:
        id_image_path = upload_image_file(id_file, folder_prefix="id_images", filename_prefix=f"id_{username}")
        if not id_image_path:
            return Response({"message": "Could not save the ID image. Please try again."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    User.objects.create_user(
        username=username,
        email=email,
        password=password,
        phone_number=phone_number,
        role=role,
        barangay=barangay,
        id_image=id_image_path,
        is_verified=(role == 'admin'),
    )
    return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)


register.cls.throttle_scope = 'register'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def login(request):
    data = request.data
    username = str(data.get('username') or '').strip()
    password = data.get('password') or ''
    portal = data.get('portal')  # 'resident' | 'admin' (sent by each login page)

    if not username or not password:
        return bad_request("Username and password are required")

    lock_key = f"login_fail:{username.lower()}:{client_ip(request)}"
    failures = cache.get(lock_key, 0)
    if failures >= settings.LOGIN_MAX_ATTEMPTS:
        minutes = settings.LOGIN_LOCKOUT_SECONDS // 60
        return Response(
            {"message": f"Too many failed attempts. Try again in {minutes} minutes or reset your password."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    user = User.objects.filter(username__iexact=username).first()
    if not user or not user.check_password(password) or not user.is_active:
        cache.set(lock_key, failures + 1, settings.LOGIN_LOCKOUT_SECONDS)
        remaining = settings.LOGIN_MAX_ATTEMPTS - failures - 1
        message = "Invalid username or password"
        if 0 < remaining <= 2:
            message += f". {remaining} attempt{'s' if remaining > 1 else ''} left before a temporary lock."
        return Response({"message": message}, status=status.HTTP_401_UNAUTHORIZED)

    # Each portal only admits its own role, enforced here rather than in the browser.
    if portal == 'admin' and not is_admin(user):
        return Response({"message": "This account is not a barangay official account."},
                        status=status.HTTP_403_FORBIDDEN)
    if portal == 'resident' and is_admin(user):
        return Response({"message": "Officials should sign in through the Barangay Official portal."},
                        status=status.HTTP_403_FORBIDDEN)

    cache.delete(lock_key)
    refresh = RefreshToken.for_user(user)
    return Response({
        "message": "Login successful",
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "user": UserSerializer(user).data,
    }, status=status.HTTP_200_OK)


login.cls.throttle_scope = 'login'


# ─── Password reset with expiring OTP ─────────────────────────────────────────

def find_user_by_identifier(identifier):
    """Look up a user by email or PH phone number."""
    identifier = str(identifier or '').strip()
    if not identifier:
        return None
    if '@' in identifier:
        return User.objects.filter(email__iexact=identifier).first()
    try:
        return User.objects.filter(phone_number=normalize_ph_phone(identifier)).first()
    except ValidationError:
        return None


def active_otp_for(user, code):
    """Return the unused, unexpired OTP matching this user and code, if any."""
    cutoff = timezone.now() - timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    return OTPStore.objects.filter(
        email=user.email, otp_code=str(code or ''), is_used=False, created_at__gte=cutoff,
    ).order_by('-created_at').first()


def otp_attempts_exceeded(user):
    """Allow 5 wrong codes per user per expiry window, then require a new code."""
    key = f"otp_fail:{user.pk}"
    return cache.get(key, 0) >= 5, key


def send_email_otp(target_email, otp):
    minutes = settings.OTP_EXPIRY_MINUTES
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
            <div style="max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #15803d; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px;">EcoConnect</h1>
                </div>
                <div style="padding: 24px;">
                    <p>You requested a code to reset your EcoConnect password.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #15803d;">{otp}</span>
                    </div>
                    <p>This code expires in {minutes} minutes. If you did not request it, you can ignore this email.</p>
                </div>
            </div>
        </body>
    </html>
    """
    try:
        send_mail("EcoConnect: Your Verification Code", f"Your EcoConnect code is {otp}. It expires in {minutes} minutes.",
                  settings.EMAIL_HOST_USER, [target_email], fail_silently=False, html_message=body)
        return True, "Email sent"
    except Exception as exc:  # SMTP misconfiguration, network, etc.
        return False, str(exc)


def mask_email(email):
    name, _, domain = email.partition('@')
    return f"{name[:2]}{'*' * max(len(name) - 2, 1)}@{domain}"


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def forgot_password(request):
    identifier = request.data.get('identifier') or request.data.get('phone_number') or request.data.get('id')
    user = find_user_by_identifier(identifier)
    if not user:
        return Response({"message": "No account matches that phone number or email."}, status=status.HTTP_404_NOT_FOUND)
    if not user.email:
        return bad_request("No recovery email is linked to this account. Please contact your barangay office.")

    otp = f"{secrets.randbelow(1_000_000):06d}"  # cryptographically random
    OTPStore.objects.filter(email=user.email, is_used=False).update(is_used=True)
    OTPStore.objects.create(email=user.email, phone_number=user.phone_number, otp_code=otp)
    cache.delete(f"otp_fail:{user.pk}")

    sent, detail = send_email_otp(user.email, otp)
    if sent:
        return Response({"message": f"Verification code sent to {mask_email(user.email)}"}, status=status.HTTP_200_OK)

    logger.error("OTP email failed: %s", detail)
    if settings.DEBUG:
        # Local development without SMTP: show the code in the server console only.
        logger.warning("DEV ONLY - OTP for %s is %s", user.email, otp)
        print(f"[DEV] OTP for {user.email}: {otp}")
        return Response({"message": "Email is not configured. The code was printed in the backend terminal.",
                         "is_simulation": True}, status=status.HTTP_200_OK)
    return Response({"message": "We couldn't send the email right now. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE)


forgot_password.cls.throttle_scope = 'otp'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def verify_otp(request):
    """Check a code without using it up, so the form can move to the next step."""
    user = find_user_by_identifier(request.data.get('identifier') or request.data.get('id'))
    if not user:
        return bad_request("Invalid or expired code")
    exceeded, key = otp_attempts_exceeded(user)
    if exceeded:
        return bad_request("Too many wrong codes. Please request a new one.")
    if not active_otp_for(user, request.data.get('otp_code')):
        cache.set(key, cache.get(key, 0) + 1, settings.OTP_EXPIRY_MINUTES * 60)
        return bad_request("Invalid or expired code")
    return Response({"message": "Code verified"}, status=status.HTTP_200_OK)


verify_otp.cls.throttle_scope = 'reset'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def reset_password(request):
    data = request.data
    user = find_user_by_identifier(data.get('identifier') or data.get('phone_number') or data.get('id'))
    if not user:
        return bad_request("Invalid or expired code")

    exceeded, key = otp_attempts_exceeded(user)
    if exceeded:
        return bad_request("Too many wrong codes. Please request a new one.")

    otp_entry = active_otp_for(user, data.get('otp_code'))
    if not otp_entry:
        cache.set(key, cache.get(key, 0) + 1, settings.OTP_EXPIRY_MINUTES * 60)
        return bad_request("Invalid or expired code")

    new_password = data.get('new_password') or ''
    error = password_errors(new_password, user)
    if error:
        return bad_request(error)

    with transaction.atomic():
        user.set_password(new_password)
        user.save(update_fields=['password'])
        otp_entry.is_used = True
        otp_entry.save(update_fields=['is_used'])
    cache.delete(key)
    return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)


reset_password.cls.throttle_scope = 'reset'


# ─── Current user & profile ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


@api_view(['PUT', 'POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data
    try:
        if data.get('username') and data.get('username') != user.username:
            username = clean_username(data.get('username'))
            if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
                return bad_request("Username already exists")
            user.username = username
        if data.get('email') and data.get('email') != user.email:
            email = clean_email(data.get('email'))
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return bad_request("Email already registered")
            user.email = email
        if data.get('phone_number') and data.get('phone_number') != user.phone_number:
            phone = normalize_ph_phone(data.get('phone_number'))
            if User.objects.filter(phone_number=phone).exclude(pk=user.pk).exists():
                return bad_request("Phone number already registered")
            user.phone_number = phone

        picture = request.FILES.get('profile_picture')
        if picture:
            validate_image_upload(picture)
    except ValidationError as exc:
        return bad_request(str(exc))

    password = data.get('password')
    if password:
        error = password_errors(password, user)
        if error:
            return bad_request(error)
        user.set_password(password)

    if picture:
        uploaded_path = upload_image_file(picture, folder_prefix="profiles", filename_prefix=f"profile_{user.username}")
        if uploaded_path:
            user.profile_picture = uploaded_path

    user.save()
    return Response({"message": "Profile updated", "user": UserSerializer(user).data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_barangay_officials(request):
    barangay = request.query_params.get('barangay') or request.user.barangay
    officials = User.objects.filter(barangay=barangay, role__in=['official', 'admin'])
    return Response(OfficialContactSerializer(officials, many=True).data, status=status.HTTP_200_OK)


# ─── Admin-only user management ───────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def get_all_users(request):
    users = User.objects.filter(barangay=request.user.barangay).order_by('-points', 'username')
    return paginated_response(request, users, UserSerializer)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def export_residents(request):
    admin = request.user
    rows = User.objects.filter(barangay=admin.barangay, role='resident').values_list(
        'username', 'email', 'phone_number', 'role', 'points', 'barangay', 'is_verified')
    df = pd.DataFrame(
        [(u, e, p, r, pts, b, "Yes" if v else "No") for u, e, p, r, pts, b, v in rows.iterator()],
        columns=["Username", "Email", "Phone Number", "Role", "Points", "Barangay", "Verified"],
    )
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Registered Residents')
    output.seek(0)
    response = HttpResponse(output.read(),
                            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = (
        f'attachment; filename=Residents_{admin.barangay}_{timezone.now().strftime("%Y%m%d")}.xlsx')
    return response


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def verify_user(request, user_id):
    target_user = get_object_or_404(User, id=user_id)
    if target_user.barangay != request.user.barangay:
        return Response({"message": "Unauthorized: User belongs to a different barangay"},
                        status=status.HTTP_403_FORBIDDEN)
    target_user.is_verified = not target_user.is_verified
    target_user.save(update_fields=['is_verified'])
    return Response({"message": f"User {'verified' if target_user.is_verified else 'unverified'}",
                     "is_verified": target_user.is_verified}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def search_users(request):
    query = request.query_params.get('query', '').strip()
    if len(query) < 2:
        return Response([], status=status.HTTP_200_OK)
    users = User.objects.filter(
        models.Q(username__icontains=query) | models.Q(phone_number__icontains=query),
        role='resident',
    ).exclude(barangay=request.user.barangay).order_by('username')
    return paginated_response(request, users, UserSerializer)


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def award_points(request, user_id):
    """Let an official award bonus points to a resident of the same barangay."""
    admin = request.user
    try:
        points = clean_int(request.data.get('points'), 'Points', min_value=1, max_value=MAX_AWARD_POINTS)
        reason = clean_text(request.data.get('reason') or 'Direct award by official', 'Reason', 255)
    except ValidationError as exc:
        return bad_request(str(exc))

    with transaction.atomic():
        target_user = get_object_or_404(User.objects.select_for_update(), id=user_id)
        if target_user.barangay != admin.barangay:
            return Response({"message": "Unauthorized: User belongs to a different barangay"},
                            status=status.HTTP_403_FORBIDDEN)
        if target_user.role != 'resident':
            return bad_request("Points can only be awarded to residents")

        User.objects.filter(pk=target_user.pk).update(points=F('points') + points)
        target_user.refresh_from_db(fields=['points'])
        target_user.title = compute_title(target_user.points)
        target_user.save(update_fields=['title'])
        award = PointAward.objects.create(user=target_user, awarded_by=admin, points=points, reason=reason)

    return Response({
        "message": f"Successfully awarded {points} points to {target_user.username}",
        "user": UserSerializer(target_user).data,
        "award": PointAwardSerializer(award).data,
    }, status=status.HTTP_200_OK)
