# Generated by Django 4.2.11 on 2024-03-20 14:42

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Preventivo', '0023_alter_preventivo_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='preventivo',
            name='data',
            field=models.DateTimeField(default=datetime.datetime(2024, 3, 20, 15, 42, 2, 436600)),
        ),
    ]
