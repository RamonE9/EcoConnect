from django.db import migrations, models

# Copied from api.models.TITLE_THRESHOLDS so this migration never changes if the ladder does.
TITLE_THRESHOLDS = {
    "Eco Legend": 500, "Planet Protector": 300, "Monster Sweeper": 200, "Bio Crusader": 150,
    "Nature's Knight": 100, "Eco Avenger": 60, "Green Guardian": 30, "Sprout Scout": 10,
}


def backfill_peak_points(apps, schema_editor):
    """Start each peak at the current balance, or higher if the stored title shows they reached more."""
    User = apps.get_model('api', 'User')
    for user in User.objects.only('id', 'points', 'title').iterator():
        peak = max(user.points, TITLE_THRESHOLDS.get(user.title or '', 0))
        User.objects.filter(pk=user.pk).update(peak_points=peak)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_remove_walk_in_add_event_completed_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='peak_points',
            field=models.IntegerField(default=0),
        ),
        migrations.RunPython(backfill_peak_points, migrations.RunPython.noop),
    ]
