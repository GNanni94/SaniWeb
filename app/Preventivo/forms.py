from django.forms import ModelForm
from .models import Dettaglio_Preventivo

class DettaglioPreventivoForm(ModelForm):
    class Meta:
        model = Dettaglio_Preventivo
        fields=(
            "messaggio",
            "luogo",
        )