# Generated by Django 4.2.14 on 2024-07-29 08:52

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0003_alter_schedetecniche_data_inizio'),
    ]

    operations = [
        migrations.AlterField(
            model_name='schedetecniche',
            name='data_inizio',
            field=models.DateTimeField(default=datetime.datetime(2024, 7, 29, 10, 52, 12, 199368)),
        ),
    ]
