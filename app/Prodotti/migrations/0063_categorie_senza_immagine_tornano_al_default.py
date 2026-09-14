from django.db import migrations

VALORE_LOGO_COPIATO = 'logo/saniscope_logo 2.png'
DEFAULT_IMMAGINE_ARTICOLO = 'default_immagine_articolo/saniscope_logo 2.png'


def resetta_al_default(apps, schema_editor):
    Categoria = apps.get_model('Prodotti', 'Categoria')
    Categoria.objects.filter(immagine_categoria=VALORE_LOGO_COPIATO).update(immagine_categoria=DEFAULT_IMMAGINE_ARTICOLO)


def ripristina_logo_copiato(apps, schema_editor):
    Categoria = apps.get_model('Prodotti', 'Categoria')
    Categoria.objects.filter(immagine_categoria=DEFAULT_IMMAGINE_ARTICOLO).update(immagine_categoria=VALORE_LOGO_COPIATO)


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0062_pulisci_prefisso_media_immagine_articolo'),
    ]

    operations = [
        migrations.RunPython(resetta_al_default, ripristina_logo_copiato),
    ]
