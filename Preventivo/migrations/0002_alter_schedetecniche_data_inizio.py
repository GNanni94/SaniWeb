# Generated by Django 4.2.10 on 2024-03-05 14:55

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='schedetecniche',
            name='data_inizio',
            field=models.DateTimeField(default=datetime.datetime(2024, 3, 5, 15, 55, 15, 27140)),
        ),
    ]