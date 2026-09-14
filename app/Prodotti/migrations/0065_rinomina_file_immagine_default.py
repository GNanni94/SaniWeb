from django.db import migrations

VECCHIO_NOME = 'default_immagine_articolo/saniscope_logo 2.png'
NUOVO_NOME = 'default_immagine_articolo/saniscope_logo.png'


def rinomina_in_avanti(apps, schema_editor):
    Categoria = apps.get_model('Prodotti', 'Categoria')
    ImmaginiArticolo = apps.get_model('Prodotti', 'ImmaginiArticolo')
    Categoria.objects.filter(immagine_categoria=VECCHIO_NOME).update(immagine_categoria=NUOVO_NOME)
    ImmaginiArticolo.objects.filter(immagine=VECCHIO_NOME).update(immagine=NUOVO_NOME)


def rinomina_indietro(apps, schema_editor):
    Categoria = apps.get_model('Prodotti', 'Categoria')
    ImmaginiArticolo = apps.get_model('Prodotti', 'ImmaginiArticolo')
    Categoria.objects.filter(immagine_categoria=NUOVO_NOME).update(immagine_categoria=VECCHIO_NOME)
    ImmaginiArticolo.objects.filter(immagine=NUOVO_NOME).update(immagine=VECCHIO_NOME)


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0064_alter_categoria_immagine_categoria_and_more'),
    ]

    operations = [
        migrations.RunPython(rinomina_in_avanti, rinomina_indietro),
    ]
