from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_user_must_change_password'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='must_change_password',
        ),
    ]
