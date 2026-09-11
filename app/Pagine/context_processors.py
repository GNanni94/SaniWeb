import datetime

ORARIO_APERTURA = datetime.time(8, 0)
ORARIO_CHIUSURA = datetime.time(17, 45)
PRANZO_INIZIO = datetime.time(12, 0)
PRANZO_FINE = datetime.time(13, 45)


def _minuti_da_mezzanotte(ora):
    return ora.hour * 60 + ora.minute


def orari_apertura(request):
    return {
        "orario_apertura": ORARIO_APERTURA,
        "orario_chiusura": ORARIO_CHIUSURA,
        "pranzo_inizio": PRANZO_INIZIO,
        "pranzo_fine": PRANZO_FINE,
        "orario_apertura_minuti": _minuti_da_mezzanotte(ORARIO_APERTURA),
        "orario_chiusura_minuti": _minuti_da_mezzanotte(ORARIO_CHIUSURA),
        "pranzo_inizio_minuti": _minuti_da_mezzanotte(PRANZO_INIZIO),
        "pranzo_fine_minuti": _minuti_da_mezzanotte(PRANZO_FINE),
    }
