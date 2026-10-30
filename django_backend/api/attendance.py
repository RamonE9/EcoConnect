"""Attendance: personal QR codes and the single routine that marks someone attended."""
import secrets

from django.core import signing
from django.db.models import F
from django.utils import timezone

from .models import User, compute_title

QR_PREFIX = 'ECO1:'
QR_SALT = 'eco-attendance-qr'


def qr_token_for(user, rotate=False):
    """Signed token printed in the resident's QR code.

    It contains the user id plus part of a per-user secret, and is signed with
    the server's SECRET_KEY, so it can't be guessed or edited. Rotating the
    secret makes every earlier code stop working.
    """
    if rotate or not user.qr_secret:
        user.qr_secret = secrets.token_hex(16)
        user.save(update_fields=['qr_secret'])
    return QR_PREFIX + signing.dumps({'u': user.pk, 's': user.qr_secret[:12]}, salt=QR_SALT, compress=True)


def user_from_qr_token(token):
    """Return the resident a scanned token belongs to, or None if it's fake or outdated."""
    token = (token or '').strip()
    if not token.startswith(QR_PREFIX):
        return None
    try:
        data = signing.loads(token[len(QR_PREFIX):], salt=QR_SALT)
    except signing.BadSignature:
        return None
    user = User.objects.filter(pk=data.get('u'), is_active=True).first()
    if not user or not user.qr_secret or user.qr_secret[:12] != data.get('s'):
        return None
    return user


def mark_attended(participation, official, method):
    """Mark a (row-locked) participation attended and award the event's points once.

    Call inside transaction.atomic() with the participation fetched via
    select_for_update(). Returns the points awarded (0 if already attended).
    """
    if participation.status == 'attended':
        return 0
    event = participation.event
    now = timezone.localtime()
    participation.status = 'attended'
    participation.attended_at = now
    participation.verified_at = now.strftime("%Y-%m-%d %I:%M:%S %p")
    participation.checkin_method = method
    participation.checked_in_by = official
    participation.save(update_fields=['status', 'attended_at', 'verified_at', 'checkin_method', 'checked_in_by'])

    User.objects.filter(pk=participation.user_id).update(points=F('points') + event.points_reward)
    member = User.objects.get(pk=participation.user_id)
    member.title = compute_title(member.points)
    member.save(update_fields=['title'])
    return event.points_reward
