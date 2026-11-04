from django.contrib.auth.hashers import check_password
from django.db import migrations, models

ADMIN_ROLES = ('admin', 'official', 'barangay_official')


def flag_officials_using_username(apps, schema_editor):
    User = apps.get_model('api', 'User')
    for user in User.objects.filter(role__in=ADMIN_ROLES).only('id', 'username', 'password'):
        if check_password(user.username, user.password):
            User.objects.filter(pk=user.pk).update(must_change_password=True)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_tagalog_titles'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='must_change_password',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(flag_officials_using_username, migrations.RunPython.noop),
    ]
