# Generated by Django 4.2.14 on 2024-07-28 09:38

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
            field=models.DateTimeField(default=datetime.datetime(2024, 7, 28, 11, 38, 12, 272437)),
        ),
    ]
