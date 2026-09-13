from django.forms import ModelForm, Textarea
from .models import Dettaglio_Preventivo

class DettaglioPreventivoForm(ModelForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Etichetta del campo messaggio
        self.fields['messaggio'].label = 'Note aggiuntive (opzionale)'
        # Altezza iniziale del textarea messaggio
        self.fields['messaggio'].widget.attrs['rows'] = 1

    class Meta:
        model = Dettaglio_Preventivo
        fields=(
            "messaggio",
            "luogo",
        )
        widgets = {
            "messaggio": Textarea,
        }