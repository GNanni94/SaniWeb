# Generated by Django 4.2.10 on 2024-03-05 14:55

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Preventivo', '0003_alter_preventivo_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='preventivo',
            name='data',
            field=models.DateTimeField(default=datetime.datetime(2024, 3, 5, 15, 55, 29, 63284)),
        ),
    ]
