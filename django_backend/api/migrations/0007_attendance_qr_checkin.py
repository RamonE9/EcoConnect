import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_hash_plaintext_passwords'),
    ]

    operations = [
        migrations.AddField(
            model_name='participation',
            name='attended_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='participation',
            name='checked_in_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='checkins_recorded', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='participation',
            name='checkin_method',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='participation',
            name='walk_in',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='qr_secret',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
    ]
