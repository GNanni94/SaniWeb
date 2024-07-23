# Generated by Django 4.2.10 on 2024-03-19 14:31

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0019_alter_schedetecniche_data_inizio'),
    ]

    operations = [
        migrations.AlterField(
            model_name='immaginiarticolo',
            name='immagine',
            field=models.ImageField(default='immagini_articoli/saniscope_logo 2.png', null=True, upload_to='immagini_articoli/'),
        ),
        migrations.AlterField(
            model_name='schedetecniche',
            name='data_inizio',
            field=models.DateTimeField(default=datetime.datetime(2024, 3, 19, 15, 31, 42, 692091)),
        ),
    ]
