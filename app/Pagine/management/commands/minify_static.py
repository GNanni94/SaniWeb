import os

import rcssmin
import rjsmin
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Toglie commenti e spazi in eccesso dai file .css/.js del progetto "
        "(app/static/css, app/static/js) gia' raccolti in STATIC_ROOT da "
        "'collectstatic' - non tocca le librerie di terze parti (servite "
        "da CDN o raccolte da altre app installate in STATIC_ROOT). Da "
        "lanciare a mano su staging/prod subito dopo 'collectstatic', "
        "prima del restart di 'web' - vedi Docs/flusso/checklist-post-pull.md"
    )

    MINIFICATORI = {
        '.css': rcssmin.cssmin,
        '.js': rjsmin.jsmin,
    }

    def handle(self, *args, **options):
        for cartella in ('css', 'js'):
            percorso_cartella = os.path.join(settings.STATIC_ROOT, cartella)
            if not os.path.isdir(percorso_cartella):
                continue

            for nome_file in os.listdir(percorso_cartella):
                _, estensione = os.path.splitext(nome_file)
                minifica = self.MINIFICATORI.get(estensione)
                if minifica is None:
                    continue

                percorso_file = os.path.join(percorso_cartella, nome_file)
                with open(percorso_file, 'r', encoding='utf-8') as f:
                    contenuto = f.read()

                with open(percorso_file, 'w', encoding='utf-8') as f:
                    f.write(minifica(contenuto))

                self.stdout.write(f'Minificato: {cartella}/{nome_file}')
