from django.db import DatabaseError

from .models import AvvisoChiusura


def avviso_chiusura(request):
    try:
        fase, avviso = AvvisoChiusura.corrente()
    except DatabaseError:
        return {"avviso_fase": None, "avviso_testo": None}
    if fase == "preavviso":
        return {"avviso_fase": "preavviso", "avviso_testo": avviso.testo_preavviso()}
    if fase == "chiusura":
        return {"avviso_fase": "chiusura", "avviso_testo": avviso.testo_chiusura()}
    return {"avviso_fase": None, "avviso_testo": None}
