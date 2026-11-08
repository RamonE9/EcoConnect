from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_redemption_claim_code'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Expense',
        ),
    ]
