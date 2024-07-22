from django.contrib.auth.forms import UserCreationForm, UserChangeForm, AuthenticationForm
from django.forms import ModelForm
from .models import Cliente, Messaggi, Registrati
from phonenumber_field.formfields import PhoneNumberField
from django import forms


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
    
   