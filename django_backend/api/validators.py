"""Small input-validation helpers used by the views."""
import re
from datetime import datetime

PH_PHONE_RE = re.compile(r'^(?:\+63|0)9\d{9}$')
USERNAME_RE = re.compile(r'^[A-Za-z0-9_.-]{3,30}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


class ValidationError(Exception):
    """Raised with a user-facing message; views turn it into a 400 response."""


def normalize_ph_phone(value):
    """Accept 09XXXXXXXXX or +639XXXXXXXXX and return +639XXXXXXXXX."""
    phone = re.sub(r'[\s-]', '', str(value or ''))
    if not PH_PHONE_RE.match(phone):
        raise ValidationError('Phone number must be a PH mobile number, e.g. 09171234567 or +639171234567.')
    return '+63' + phone[-10:]


def clean_username(value):
    username = str(value or '').strip()
    if not USERNAME_RE.match(username):
        raise ValidationError('Username must be 3-30 characters: letters, numbers, dot, dash or underscore.')
    return username


def clean_email(value):
    email = str(value or '').strip().lower()
    if not EMAIL_RE.match(email) or len(email) > 120:
        raise ValidationError('Enter a valid email address.')
    return email


def clean_text(value, field, max_length, required=True):
    text = str(value or '').strip()
    if required and not text:
        raise ValidationError(f'{field} is required.')
    if len(text) > max_length:
        raise ValidationError(f'{field} must be at most {max_length} characters.')
    return text


def clean_int(value, field, min_value=None, max_value=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValidationError(f'{field} must be a whole number.')
    if min_value is not None and number < min_value:
        raise ValidationError(f'{field} must be at least {min_value}.')
    if max_value is not None and number > max_value:
        raise ValidationError(f'{field} must be at most {max_value}.')
    return number


def clean_amount(value, field='Amount', max_value=100_000_000):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f'{field} must be a number.')
    if number <= 0:
        raise ValidationError(f'{field} must be greater than zero.')
    if number > max_value:
        raise ValidationError(f'{field} is too large.')
    return round(number, 2)


def clean_event_date(value, allow_past=False):
    try:
        event_date = datetime.strptime(str(value), '%Y-%m-%d').date()
    except ValueError:
        raise ValidationError('Invalid date format. Expected YYYY-MM-DD.')
    today = datetime.now().date()
    if not allow_past and event_date < today:
        raise ValidationError('Event date cannot be in the past.')
    if event_date.year > today.year + 2:
        raise ValidationError('Event date must be within the next two years.')
    return str(event_date)
