# Generated by Django 4.2.14 on 2024-07-29 08:52

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Preventivo', '0004_alter_preventivo_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='preventivo',
            name='data',
            field=models.DateTimeField(default=datetime.datetime(2024, 7, 29, 10, 52, 12, 252368)),
        ),
    ]