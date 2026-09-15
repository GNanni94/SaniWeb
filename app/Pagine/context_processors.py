import datetime

from django.db import DatabaseError

from Avvisi.models import TestiPillolaOrari

ORARIO_APERTURA = datetime.time(8, 0)
ORARIO_CHIUSURA = datetime.time(17, 45)
PRANZO_INIZIO = datetime.time(12, 0)
PRANZO_FINE = datetime.time(13, 45)


def _minuti_da_mezzanotte(ora):
    return ora.hour * 60 + ora.minute


def orari_apertura(request):
    try:
        testi = TestiPillolaOrari.corrente()
    except DatabaseError:
        testi = TestiPillolaOrari()
    return {
        "orario_apertura": ORARIO_APERTURA,
        "orario_chiusura": ORARIO_CHIUSURA,
        "pranzo_inizio": PRANZO_INIZIO,
        "pranzo_fine": PRANZO_FINE,
        "orario_apertura_minuti": _minuti_da_mezzanotte(ORARIO_APERTURA),
        "orario_chiusura_minuti": _minuti_da_mezzanotte(ORARIO_CHIUSURA),
        "pranzo_inizio_minuti": _minuti_da_mezzanotte(PRANZO_INIZIO),
        "pranzo_fine_minuti": _minuti_da_mezzanotte(PRANZO_FINE),
        "testo_pillola_aperto": testi.testo_aperto,
        "testo_pillola_vicino_chiusura": testi.testo_vicino_chiusura,
        "testo_pillola_pranzo": testi.testo_pranzo,
        "testo_pillola_chiuso_feriale": testi.testo_chiuso_feriale,
        "testo_pillola_chiuso_weekend": testi.testo_chiuso_weekend,
    }
