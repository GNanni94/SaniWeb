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



    '''
    il mio form non contiene username (contenuta in Registrati che estende AbstractUser che deve essere unique). 
    Quando esenguo la vista SignUpView il "return super().form_valid(form)" delega al super che a a sua volta esegue "form.save()" che non contenendo username (vuoto/null) esplode.
    Quindi override del metodo save di UserCreationForm
    '''
    def save(self, commit=True):
        # Chiama il metodo save() della classe padre (UserCreationForm)
        user = super().save(commit=False)
        
        # Assegna il valore dell'email al campo username
        user.username = self.cleaned_data.get("email")
        
        # Salva l'oggetto se commit è True
        if commit:
            user.save()
            
        return user

    def clean_codiceFiscale_PartitaIVA(self):
        logger = logging.getLogger(__name__)
        codiceFiscale_PartitaIVA = self.cleaned_data['codiceFiscale_PartitaIVA']
        
        logger.info(f" {codiceFiscale_PartitaIVA} che arriva")

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
    
