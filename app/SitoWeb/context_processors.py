import datetime

from django.utils import timezone

# Chiusura aziendale estiva 2026: comunicata con due banner in sequenza
# (vedi partials/avviso_chiusura.html, incluso in base.html) - "preavviso"
# (giallo) fino all'inizio della chiusura, poi "chiusura" (rosso) per tutta
# la durata. Date/testo fissi nel codice: evento una tantum, non serve
# un'interfaccia di amministrazione per questo.
INIZIO_CHIUSURA = datetime.datetime(2026, 8, 7, 0, 1)
FINE_CHIUSURA = datetime.datetime(2026, 8, 24, 0, 1)


def avviso_chiusura(request):
    ora = timezone.now()
    inizio = timezone.make_aware(INIZIO_CHIUSURA)
    fine = timezone.make_aware(FINE_CHIUSURA)
    if ora < inizio:
        return {"avviso_chiusura": "preavviso"}
    if ora < fine:
        return {"avviso_chiusura": "chiusura"}
    return {"avviso_chiusura": None}
