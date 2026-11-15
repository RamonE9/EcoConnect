from django.db import migrations

BARANGAYS = ['Santa Monica', 'Tiniguiban', 'Tagburos']

CATEGORIES = [
    'General Cleanup', 'Coastal Cleanup', 'Tree Planting', 'River Cleanup',
    'Waste Segregation', 'Mangrove Planting', 'Urban Gardening',
]


def seed(apps, schema_editor):
    Barangay = apps.get_model('api', 'Barangay')
    EventCategory = apps.get_model('api', 'EventCategory')
    for name in BARANGAYS:
        Barangay.objects.get_or_create(name=name, defaults={'city': 'Puerto Princesa City', 'is_participating': True})
    for name in CATEGORIES:
        EventCategory.objects.get_or_create(name=name)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
