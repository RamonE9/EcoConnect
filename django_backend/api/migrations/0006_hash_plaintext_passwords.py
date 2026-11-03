from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX, identify_hasher, make_password
from django.db import migrations


def hash_plaintext_passwords(apps, schema_editor):
    User = apps.get_model('api', 'User')
    for user in User.objects.exclude(password='').only('id', 'password'):
        if user.password.startswith(UNUSABLE_PASSWORD_PREFIX):
            continue
        try:
            identify_hasher(user.password)
        except ValueError:
            User.objects.filter(pk=user.pk).update(password=make_password(user.password))


class Migration(migrations.Migration):
    dependencies = [('api', '0005_redemption_quantity_incentive_max_per_claim')]
    operations = [migrations.RunPython(hash_plaintext_passwords, migrations.RunPython.noop)]
