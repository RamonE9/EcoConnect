import secrets

from django.core import signing
from django.db.models import F
from django.utils import timezone

from .models import Participation, Redemption, User

TICKET_PREFIX = 'ECO2:'
TICKET_SALT = 'eco-event-ticket'
CLAIM_PREFIX = 'ECOR:'
CLAIM_SALT = 'eco-reward-claim'
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def new_ticket_code():
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(8))


def ensure_ticket_code(participation):
    if not participation.ticket_code:
        participation.ticket_code = new_ticket_code()
        participation.save(update_fields=['ticket_code'])
    return participation.ticket_code


def format_code(code):
    return f"{code[:4]}-{code[4:]}" if code else ''


def normalize_code(text):
    return ''.join(ch for ch in str(text or '').upper() if ch in CODE_ALPHABET)


def ticket_token(participation):
    code = ensure_ticket_code(participation)
    return TICKET_PREFIX + signing.dumps({'p': participation.pk, 'c': code}, salt=TICKET_SALT, compress=True)


def participation_from_ticket(event, token=None, code=None):
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


def ensure_claim_code(redemption):
    if not redemption.claim_code:
        redemption.claim_code = new_ticket_code()
        redemption.save(update_fields=['claim_code'])
    return redemption.claim_code


def claim_token(redemption):
    code = ensure_claim_code(redemption)
    return CLAIM_PREFIX + signing.dumps({'r': redemption.pk, 'c': code}, salt=CLAIM_SALT, compress=True)


def redemption_from_claim(token=None, code=None):
    claims = Redemption.objects.select_related('user')
    if token:
        token = token.strip()
        if token.startswith(TICKET_PREFIX):
            return None, 'event_ticket'
        if not token.startswith(CLAIM_PREFIX):
            return None, 'invalid'
        try:
            data = signing.loads(token[len(CLAIM_PREFIX):], salt=CLAIM_SALT)
        except signing.BadSignature:
            return None, 'invalid'
        found = claims.filter(pk=data.get('r'), claim_code=data.get('c')).first()
        return (found, None) if found else (None, 'invalid')

    code = normalize_code(code)
    if len(code) != 8:
        return None, 'invalid'
    found = claims.filter(claim_code=code).first()
    return (found, None) if found else (None, 'invalid')
