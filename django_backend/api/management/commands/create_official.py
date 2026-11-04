from django.core.management.base import BaseCommand, CommandError

from api.models import User
from api.validators import ValidationError, clean_email, clean_username, normalize_ph_phone


class Command(BaseCommand):
    help = 'Create a barangay official account. The first password is the username.'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True)
        parser.add_argument('--email', required=True)
        parser.add_argument('--phone', required=True, help='PH mobile number, e.g. 09171234567')
        parser.add_argument('--barangay', required=True, help='Exact barangay name, e.g. "Santa Monica"')

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

        User.objects.create_user(username=username, email=email, password=username, phone_number=phone,
                                 role='admin', barangay=barangay, is_verified=True, must_change_password=True)
        self.stdout.write(self.style.SUCCESS(
            f'Official account "{username}" created for {barangay}. '
            f'The first password is the username; they must set a new one when they first sign in.'))
