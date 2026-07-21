from django.contrib.auth.forms import UserCreationForm, UserChangeForm, AuthenticationForm, PasswordResetForm
from django.forms import ModelForm
from .models import Cliente, Messaggi, Registrati
from phonenumber_field.formfields import PhoneNumberField
from django import forms
import logging
import re

# Stessa regex usata lato client (vedi signup.html): EmailField di Django da
# solo accetta anche domini senza un vero punto+TLD (es. "test@localhost",
# pensato per casi come indirizzi di rete locale) - qui viene richiesto un
# punto nel dominio seguito da almeno 2 caratteri
EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')


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
        # rows basso apposta: l'altezza cresce da sola mentre si scrive
        # (vedi JS in contatti.html), quindi non serve partire gia' alta
        widgets = {
            "contenuto": forms.Textarea(attrs={"rows": 1}),
        }




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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # L'elenco regole generato di default da AUTH_PASSWORD_VALIDATORS e'
        # gia' mostrato in modo piu' chiaro dalla checklist live in
        # signup.html, quindi qui va tolto per non duplicarlo
        self.fields["password1"].help_text = ""
        self.fields["password2"].help_text = ""
        self.fields["cognome_ragione_sociale"].label = "Cognome"
        self.fields["email"].widget.attrs["placeholder"] = "nome@dominio.it"

    def clean_email(self):
        email = self.cleaned_data["email"]
        if not EMAIL_REGEX.match(email):
            raise forms.ValidationError("Inserisci un indirizzo email valido.")
        return email



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
    username = forms.EmailField(label='Email', widget=forms.EmailInput(attrs={'class':'form-control'}))
    password = forms.CharField(label='Password', widget=forms.PasswordInput(attrs={'class':'form-control'}))


class CustomPasswordResetForm(PasswordResetForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["email"].widget.attrs["placeholder"] = "inserisci l'email"
        # label=False (non solo stringa vuota): crispy-forms non renderizza
        # proprio il tag <label>, invece che lasciarne uno vuoto - qui basta
        # gia' il placeholder a indicare cosa scrivere nel campo
        self.fields["email"].label = False

