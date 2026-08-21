
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Expense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('barangay', models.CharField(max_length=50)),
                ('amount', models.FloatField()),
                ('description', models.CharField(max_length=200)),
                ('category', models.CharField(default='Spent', max_length=50)),
                ('date', models.CharField(max_length=50)),
            ],
        ),
        migrations.CreateModel(
            name='Redemption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_name', models.CharField(max_length=100)),
                ('points_spent', models.IntegerField()),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(default='Pending', max_length=20)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='redemptions', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='TransferRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source_barangay', models.CharField(max_length=50)),
                ('target_barangay', models.CharField(max_length=50)),
                ('reason', models.TextField(blank=True, null=True)),
                ('status', models.CharField(default='Pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transfer_requests', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
