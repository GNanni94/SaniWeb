# Generated by Django 4.2.14 on 2024-12-09 16:33

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0005_alter_schedetecniche_data_inizio'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='sottocategoria',
            options={},
        ),
        migrations.AddField(
            model_name='prodotto',
            name='precursore',
            field=models.CharField(blank=True, max_length=250, null=True),
        ),
        migrations.AlterField(
            model_name='schedetecniche',
            name='data_inizio',
            field=models.DateTimeField(default=datetime.datetime(2024, 12, 9, 17, 33, 4, 554109)),
        ),
        migrations.AlterModelTable(
            name='sottocategoria',
            table=None,
        ),
    ]
