from django.db import migrations


def rimuovi_prefisso_media(apps, schema_editor):
    ImmaginiArticolo = apps.get_model('Prodotti', 'ImmaginiArticolo')
    for immagine_articolo in ImmaginiArticolo.objects.filter(immagine__startswith='/media/'):
        immagine_articolo.immagine = immagine_articolo.immagine.name[len('/media/'):]
        immagine_articolo.save(update_fields=['immagine'])


def aggiungi_prefisso_media(apps, schema_editor):
    ImmaginiArticolo = apps.get_model('Prodotti', 'ImmaginiArticolo')
    for immagine_articolo in ImmaginiArticolo.objects.all():
        if immagine_articolo.immagine and not immagine_articolo.immagine.name.startswith('/media/'):
            immagine_articolo.immagine = '/media/' + immagine_articolo.immagine.name
            immagine_articolo.save(update_fields=['immagine'])


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0061_alter_immaginiarticolo_immagine'),
    ]

    operations = [
        migrations.RunPython(rimuovi_prefisso_media, aggiungi_prefisso_media),
    ]
