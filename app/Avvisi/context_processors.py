from .models import AvvisoChiusura


def avviso_chiusura(request):
    fase, avviso = AvvisoChiusura.corrente()
    if fase == "preavviso":
        return {"avviso_fase": "preavviso", "avviso_testo": avviso.testo_preavviso()}
    if fase == "chiusura":
        return {"avviso_fase": "chiusura", "avviso_testo": avviso.testo_chiusura()}
    return {"avviso_fase": None, "avviso_testo": None}
