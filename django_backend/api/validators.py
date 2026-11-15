import re
from datetime import datetime

PH_PHONE_RE = re.compile(r'^(?:\+63|0)9\d{9}$')
USERNAME_RE = re.compile(r'^[A-Za-z0-9_.-]{3,30}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
PERSON_NAME_RE = re.compile(r"^[^\W\d_](?:[^\W\d_]|[ .'-])*$")


class ValidationError(Exception):
    pass


def normalize_ph_phone(value):
    phone = re.sub(r'[\s-]', '', str(value or ''))
    if not PH_PHONE_RE.match(phone):
        raise ValidationError('Phone number must be a PH mobile number, e.g. 09171234567 or +639171234567.')
    return '+63' + phone[-10:]


def clean_person_name(value, label):
    name = ' '.join(str(value or '').split())
    if not name:
        raise ValidationError(f'{label} is required.')
    if len(name) > 50 or not PERSON_NAME_RE.match(name):
        raise ValidationError(f'{label} can only use letters, spaces, dots, dashes or apostrophes (max 50).')
    return name


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
    return event_date


def clean_event_time(value):
    text = str(value or '').strip()
    for fmt in ('%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M%p'):
        try:
            return datetime.strptime(text.upper() if 'M' in fmt else text, fmt).time()
        except ValueError:
            continue
    raise ValidationError('Invalid time. Use a time such as 08:00.')


def clean_barangay(value, field='Barangay'):
    from .models import Barangay

    if isinstance(value, Barangay):
        return value
    name = ' '.join(str(value or '').split())
    if not name:
        raise ValidationError(f'{field} is required.')
    barangay = Barangay.objects.filter(name__iexact=name).first()
    if not barangay:
        raise ValidationError(f'{field} "{name}" is not a registered barangay.')
    return barangay


def clean_category(value):
    from .models import EventCategory

    name = ' '.join(str(value or '').split()) or 'General Cleanup'
    category = EventCategory.objects.filter(name__iexact=name).first()
    if not category:
        raise ValidationError('Unknown event category.')
    return category
