from django.forms import ModelForm
from .models import Dettaglio_Preventivo

class DettaglioPreventivoForm(ModelForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Etichetta piu' esplicita del nome campo di default ("Messaggio"),
        # per la box "Informazioni" nel carrello (carrello.html)
        self.fields['messaggio'].label = 'Note aggiuntive (opzionale)'
        # rows basso apposta: l'altezza cresce da sola mentre si scrive
        # (vedi JS in carrello.html), stesso pattern gia' usato da
        # MessaggioForm/contatti.html per il campo "Contenuto" - non serve
        # partire gia' alta come il default di Django ("rows: 10")
        self.fields['messaggio'].widget.attrs['rows'] = 1

    class Meta:
        model = Dettaglio_Preventivo
        fields=(
            "messaggio",
            "luogo",
        )