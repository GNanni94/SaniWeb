from django.db import migrations

DOCUMENTO_PRECURSORI = "documenti/Regolamento-2019-1148_esplosivi.pdf"

# Codici prodotto cosi' come elencati nel file Cartel1.xlsx fornito
# dall'azienda (colonna "Codice"). Il match e' fatto per uguaglianza esatta:
# su ogni ambiente (dev, staging, prod) verranno aggiornati solo i prodotti
# effettivamente presenti con questo codice - se un ambiente ha un catalogo
# non allineato (es. dev locale, dove alcuni di questi prodotti non esistono
# ancora), quei codici vengono semplicemente ignorati senza errori, invece
# di forzare un adattamento (codice base, esclusione) pensato sui limiti di
# un singolo ambiente.
CODICI_PRECURSORI = [
    "C0044-25", "C0044-50", "C0044", "C0047-50", "C0047-10", "C0047", "C0047-25",
    "C0722-5", "C0722-25", "C0068-50", "C0068-8", "C0068", "C0068-25",
    "C0069-10", "C0069-25", "C0069", "C0256", "C0375", "C0375-25",
    "C0424-1", "C0424-2.5", "C0518-10", "C0518-5", "C0523",
    "C0567-10", "C0567", "C0567-25", "C0602", "C0617", "C0626",
    "C0699-2.5", "C0699-5", "C0699-25", "C0747", "C0791", "C0847", "C1147",
]


def popola_precursore(apps, schema_editor):
    Prodotto = apps.get_model("Prodotti", "Prodotto")
    Prodotto.objects.exclude(codice_prodotto__in=CODICI_PRECURSORI).update(precursore=None)
    Prodotto.objects.filter(codice_prodotto__in=CODICI_PRECURSORI).update(precursore=DOCUMENTO_PRECURSORI)


def rimuovi_precursore(apps, schema_editor):
    Prodotto = apps.get_model("Prodotti", "Prodotto")
    Prodotto.objects.filter(codice_prodotto__in=CODICI_PRECURSORI).update(precursore=None)


class Migration(migrations.Migration):

    dependencies = [
        ('Prodotti', '0033_alter_prodotto_precursore'),
    ]

    operations = [
        migrations.RunPython(popola_precursore, rimuovi_precursore),
    ]
