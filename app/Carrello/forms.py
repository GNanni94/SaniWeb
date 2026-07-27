from django.forms import ModelForm
from .models import Carrello
from django.forms.widgets import TextInput
import numbers

class CarrelloForm(ModelForm):

    def __init__(self, *args, **kwargs):
        super(CarrelloForm, self).__init__(*args, **kwargs)
        self.fields['quantita'].widget.attrs['min'] = 0
        self.fields['quantita'].widget.attrs['class'] = 'text-center'
        self.fields['quantita'].widget.attrs['style'] = 'max-width: 55px;'
        # etichetta abbreviata: nella card del carrello lo spazio orizzontale
        # e' molto limitato (colonna condivisa con box e bottone aggiorna)
        self.fields['quantita'].label = 'Qtà'

    class Meta:
        model = Carrello
        fields = (
            "quantita",
        )