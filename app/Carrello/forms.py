from django.forms import ModelForm
from .models import Carrello
from django.forms.widgets import TextInput
import numbers

class CarrelloForm(ModelForm):

    def __init__(self, *args, **kwargs):
        super(CarrelloForm, self).__init__(*args, **kwargs)
        self.fields['quantita'].widget.attrs['min'] = 0

    class Meta:
        model = Carrello
        fields = (
            "quantita",
        )