from django.contrib.auth.forms import UserCreationForm, UserChangeForm, AuthenticationForm
from django.forms import ModelForm
from .models import Cliente, Messaggi, Registrati
from phonenumber_field.formfields import PhoneNumberField
from django import forms
import logging


class ClienteForm(ModelForm):
    class Meta:
        model = Cliente
        fields = (
            "nome",
            "cognome_ragione_sociale",
            "email",
            "indirizzo",
            "citta",
            "telefono",
        )

class MessaggioForm(ModelForm):
    class Meta:
        model = Messaggi
        fields = (
            "contenuto",
        ) 




class ClienteCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    class Meta:
        model = Registrati
        
        fields = (
            "email",
            "first_name",
            "cognome_ragione_sociale",
            "codiceFiscale_PartitaIVA",
            "indirizzo",
            "citta",
            "telefono",
        ) 

    def clean_codiceFiscale_PartitaIVA(self):
        logger = logging.getLogger(__name__)
        codiceFiscale_PartitaIVA = self.cleaned_data['codiceFiscale_PartitaIVA']
        
        logger.info(f" {codiceFiscale_PartitaIVA} che arriva")

        raise forms.ValidationError("Error Message") # Your own error message that will appear to the user in case the field is not valid
        return codiceFiscale_PartitaIVA # In case everything is fine just return user's input.



class ClienteChangeForm(UserChangeForm):
    class Meta:
        model = Registrati
        fields = (  
            "first_name",
            "cognome_ragione_sociale",
            "codiceFiscale_PartitaIVA",
            "indirizzo",
            "citta",
            "telefono",
        )  

class CustomAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(label='Inserisci email', widget=forms.EmailInput(attrs={'class':'form-control'}))
    password = forms.CharField(label='Inserisci password', widget=forms.PasswordInput(attrs={'class':'form-control'}))
    
