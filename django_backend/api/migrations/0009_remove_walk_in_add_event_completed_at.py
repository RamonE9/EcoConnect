from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_event_tickets_and_participant_limit'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='participation',
            name='walk_in',
        ),
        migrations.AddField(
            model_name='event',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
