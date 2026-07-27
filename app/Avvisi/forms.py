from django import forms

from .models import AvvisoChiusura


class AvvisoChiusuraForm(forms.ModelForm):
    class Meta:
        model = AvvisoChiusura
        fields = ("data_inizio", "data_fine", "motivo_chiusura", "attivo")
        widgets = {
            "data_inizio": forms.DateInput(attrs={"type": "date"}),
            "data_fine": forms.DateInput(attrs={"type": "date"}),
        }
