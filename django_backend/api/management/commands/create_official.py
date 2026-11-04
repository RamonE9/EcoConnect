import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management.base import BaseCommand, CommandError

from api.models import User
from api.validators import ValidationError, clean_email, clean_username, normalize_ph_phone


class Command(BaseCommand):
    help = 'Create a barangay official account (officials cannot sign up in the app).'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)
        parser.add_argument('--email', required=True)
        parser.add_argument('--phone', required=True, help='PH mobile number, e.g. 09171234567')
        parser.add_argument('--barangay', required=True, help='Exact barangay name, e.g. "Santa Monica"')
        parser.add_argument('--password', help='Leave out to be asked securely')

    def handle(self, *args, **opts):
        try:
            username = clean_username(opts['username'])
            email = clean_email(opts['email'])
            phone = normalize_ph_phone(opts['phone'])
        except ValidationError as exc:
            raise CommandError(str(exc))
        barangay = opts['barangay'].strip()
        if not barangay:
            raise CommandError('Barangay is required.')

        if User.objects.filter(username__iexact=username).exists():
            raise CommandError('That username is already taken.')
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError('That email is already registered.')
        if User.objects.filter(phone_number=phone).exists():
            raise CommandError('That phone number is already registered.')

        password = opts.get('password') or getpass.getpass('Password: ')
        if not opts.get('password') and password != getpass.getpass('Password (again): '):
            raise CommandError('Passwords did not match.')
        try:
            validate_password(password, User(username=username, email=email))
        except DjangoValidationError as exc:
            raise CommandError(' '.join(exc.messages))

        User.objects.create_user(username=username, email=email, password=password, phone_number=phone,
                                 role='admin', barangay=barangay, is_verified=True)
        self.stdout.write(self.style.SUCCESS(f'Official account "{username}" created for {barangay}.'))
