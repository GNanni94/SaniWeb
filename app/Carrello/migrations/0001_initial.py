# Generated by Django 4.2.14 on 2024-07-27 16:52

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Carrello',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantita', models.IntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Carrello',
                'verbose_name_plural': 'Carrelli',
                'db_table': 'Carrello',
            },
        ),
    ]