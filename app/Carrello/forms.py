from django.forms import ModelForm
from .models import Carrello

class CarrelloForm(ModelForm):

    class Meta:
        model = Carrello
        fields = (
            "quantita",
        )
