from django.core.management.base import BaseCommand

from Prodotti.models import Categoria, ImmaginiArticolo, DEFAULT_IMMAGINE_ARTICOLO
from Prodotti.utils import comprimi_immagine


class Command(BaseCommand):
    help = "Ricomprime in-place le immagini gia' esistenti di Categoria e ImmaginiArticolo (ridimensionamento + qualita' JPEG)."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Mostra i risparmi senza scrivere i file.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        campi = [
            (Categoria.objects.all(), 'immagine_categoria'),
            (ImmaginiArticolo.objects.all(), 'immagine'),
        ]

        totale_prima = 0
        totale_dopo = 0
        elaborate = 0

        for queryset, nome_campo in campi:
            for oggetto in queryset:
                campo_file = getattr(oggetto, nome_campo)
                if not campo_file or campo_file.name == DEFAULT_IMMAGINE_ARTICOLO:
                    continue
                if not campo_file.storage.exists(campo_file.name):
                    self.stdout.write(self.style.WARNING(f"File mancante su disco: {campo_file.name}"))
                    continue

                dimensione_prima = campo_file.size
                with campo_file.open('rb') as f:
                    contenuto_compresso = comprimi_immagine(f)
                dimensione_dopo = contenuto_compresso.size

                totale_prima += dimensione_prima
                totale_dopo += dimensione_dopo
                elaborate += 1

                self.stdout.write(f"{campo_file.name}: {dimensione_prima} -> {dimensione_dopo} bytes")

                if not dry_run:
                    with campo_file.storage.open(campo_file.name, 'wb') as destinazione:
                        destinazione.write(contenuto_compresso.read())

        self.stdout.write(self.style.SUCCESS(
            f"\n{elaborate} immagini elaborate. Totale: {totale_prima} -> {totale_dopo} bytes"
            f" ({'anteprima, nessun file scritto' if dry_run else 'file sovrascritti'})"
        ))
