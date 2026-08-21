
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_expense_redemption_transferrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_picture',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
