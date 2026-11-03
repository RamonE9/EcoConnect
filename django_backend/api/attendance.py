"""Attendance: event tickets (QR + short code) and the routine that marks someone attended."""
import secrets

from django.core import signing
from django.db.models import F
from django.utils import timezone

from .models import Participation, User

TICKET_PREFIX = 'ECO2:'
TICKET_SALT = 'eco-event-ticket'
# No 0/O or 1/I, so codes are easy to read aloud and type.
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def new_ticket_code():
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(8))


def ensure_ticket_code(participation):
    """Give a participation its ticket code if it doesn't have one yet."""
    if not participation.ticket_code:
        participation.ticket_code = new_ticket_code()
        participation.save(update_fields=['ticket_code'])
    return participation.ticket_code


def format_code(code):
    return f"{code[:4]}-{code[4:]}" if code else ''


def normalize_code(text):
    return ''.join(ch for ch in str(text or '').upper() if ch in CODE_ALPHABET)


def ticket_token(participation):
    """Signed text inside the ticket's QR code: which registration it is, plus its secret code.

    Signed with the server's SECRET_KEY, so it can't be edited or made up. Leaving
    the event deletes the registration, which makes the ticket useless.
    """
    code = ensure_ticket_code(participation)
    return TICKET_PREFIX + signing.dumps({'p': participation.pk, 'c': code}, salt=TICKET_SALT, compress=True)


def participation_from_ticket(event, token=None, code=None):
    """Find the registration a scanned QR or typed code refers to.

    Returns (participation, error). `error` is None, 'invalid', or 'other_event'
    (a real ticket, but for a different event; the participation is returned so
    the message can name that event).
    """
    if token:
        token = token.strip()
        if not token.startswith(TICKET_PREFIX):
            return None, 'invalid'
        try:
            data = signing.loads(token[len(TICKET_PREFIX):], salt=TICKET_SALT)
        except signing.BadSignature:
            return None, 'invalid'
        p = (Participation.objects.select_related('user', 'event')
             .filter(pk=data.get('p'), ticket_code=data.get('c')).first())
        if not p:
            return None, 'invalid'
        return (p, None) if p.event_id == event.pk else (p, 'other_event')

    code = normalize_code(code)
    if len(code) != 8:
        return None, 'invalid'
    p = Participation.objects.select_related('user', 'event').filter(event=event, ticket_code=code).first()
    return (p, None) if p else (None, 'invalid')


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
    User.objects.get(pk=participation.user_id).refresh_title()
    return event.points_reward
