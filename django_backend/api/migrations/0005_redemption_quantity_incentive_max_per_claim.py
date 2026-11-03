from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_incentive_event_category_user_title_pointaward'),
    ]

    operations = [
        migrations.AddField(
            model_name='incentive',
            name='max_per_claim',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='redemption',
            name='quantity',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AlterField(
            model_name='user',
            name='id_image',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='profile_picture',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
