import secrets

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def give_pending_claims_a_code(apps, schema_editor):
    Redemption = apps.get_model('api', 'Redemption')
    for redemption in Redemption.objects.filter(status='Pending', claim_code__isnull=True).only('id'):
        code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        Redemption.objects.filter(pk=redemption.pk).update(claim_code=code)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_remove_user_must_change_password'),
    ]

    operations = [
        migrations.AddField(
            model_name='redemption',
            name='claim_code',
            field=models.CharField(blank=True, db_index=True, max_length=8, null=True),
        ),
        migrations.AddField(
            model_name='redemption',
            name='claimed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='redemption',
            name='claimed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name='claims_released', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(give_pending_claims_a_code, migrations.RunPython.noop),
    ]
