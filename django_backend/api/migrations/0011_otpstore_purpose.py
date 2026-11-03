from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_user_peak_points'),
    ]

    operations = [
        migrations.AddField(
            model_name='otpstore',
            name='purpose',
            field=models.CharField(default='reset', max_length=10),
        ),
    ]
