from django.core.management.base import BaseCommand
from django.db import connection

LEGACY_MARKER = 'api_user'
OWNED_PREFIXES = ('api_', 'auth_', 'django_', 'users', 'barangays', 'events', 'event_', 'rewards', 'reward_',
                  'point_awards', 'transfer_requests', 'otp_codes')


class Command(BaseCommand):
    help = ("One-time rebuild: if the old api_* tables exist, drop every EcoConnect and Django table so that "
            "`migrate` can create the new connected schema. Does nothing once the new schema is in place.")

    def handle(self, *args, **options):
        tables = connection.introspection.table_names()
        if LEGACY_MARKER not in tables:
            self.stdout.write('New schema already in place. Nothing to rebuild.')
            return

        doomed = [t for t in tables if t.startswith(OWNED_PREFIXES)]
        self.stdout.write(self.style.WARNING(f'Old schema found. Dropping {len(doomed)} tables: {", ".join(sorted(doomed))}'))
        with connection.cursor() as cursor:
            for table in doomed:
                if connection.vendor == 'postgresql':
                    cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
                else:
                    cursor.execute(f'DROP TABLE IF EXISTS "{table}"')
        self.stdout.write(self.style.SUCCESS('Old tables removed. Run `migrate` next to create the new schema.'))
