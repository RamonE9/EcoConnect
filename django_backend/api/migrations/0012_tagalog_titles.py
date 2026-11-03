from django.db import migrations

# Old English title -> new Tagalog title at the same points level.
RENAMES = {
    "Sprout Scout": "Budol ng Kalikasan",
    "Green Guardian": "Pormang Tanim",
    "Eco Avenger": "Dahon Ranger",
    "Nature's Knight": "Beterano sa Damo",
    "Bio Crusader": "Super Tropikal",
    "Monster Sweeper": "Plantitosaurus",
    "Planet Protector": "Lodi ng Lupa",
    "Eco Legend": "Halaman Master",
}


def rename_titles(apps, schema_editor):
    User = apps.get_model('api', 'User')
    for old, new in RENAMES.items():
        User.objects.filter(title=old).update(title=new)


def restore_titles(apps, schema_editor):
    User = apps.get_model('api', 'User')
    for old, new in RENAMES.items():
        User.objects.filter(title=new).update(title=old)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_otpstore_purpose'),
    ]

    operations = [
        migrations.RunPython(rename_titles, restore_titles),
    ]
