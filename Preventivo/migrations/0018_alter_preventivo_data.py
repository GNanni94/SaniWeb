# Generated by Django 4.1 on 2024-03-07 14:27

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Preventivo', '0017_alter_preventivo_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='preventivo',
            name='data',
            field=models.DateTimeField(default=datetime.datetime(2024, 3, 7, 15, 27, 23, 725783)),
        ),
    ]
