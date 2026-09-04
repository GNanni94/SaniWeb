from django import forms

from .models import AvvisoChiusura


class AvvisoChiusuraForm(forms.ModelForm):
    class Meta:
        model = AvvisoChiusura
        fields = ("data_inizio", "data_fine", "motivo_chiusura", "attivo")
        labels = {
            "attivo": "Attiva ora",
        }
        widgets = {
            # "format" esplicito: un <input type="date"> HTML5 richiede il
            # valore in ISO (YYYY-MM-DD), sempre - senza questo, Django
            # formatta un valore non "bound" (es. da instance=avviso, vedi
            # "modifica_avviso" GET in views.py) secondo la localizzazione
            # italiana (07/08/2026), che il browser ignora silenziosamente
            # mostrando il campo vuoto. Un form "bound" (dati appena
            # sottomessi, es. dopo un errore di validazione) non e'
            # interessato: mostra sempre la stringa grezza inviata dal
            # browser, gia' in ISO
            "data_inizio": forms.DateInput(attrs={"type": "date"}, format="%Y-%m-%d"),
            "data_fine": forms.DateInput(attrs={"type": "date"}, format="%Y-%m-%d"),
        }
