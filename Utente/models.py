from typing import Any
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField
from django.contrib.auth.models import AbstractUser, AbstractBaseUser


# Create your models here.
class Cliente(models.Model):
    nome = models.CharField(max_length = 30, blank=True)
    cognome_ragione_sociale = models.CharField(max_length=50, blank=True, null=False)
    email = models.EmailField(max_length=150,blank=True)
    indirizzo = models.CharField(max_length=255, blank=True)
    citta = models.CharField(max_length=255, blank=True)
    telefono = PhoneNumberField(null=False, blank=True)


    class Meta:
        db_table = "Cliente"
        verbose_name_plural = "Clienti"


class Messaggi (models.Model):
    contenuto = models.TextField(max_length = 400, blank=True)

    def __str__ (self):
        return self.contenuto

    class Meta:
        db_table = "Messaggio"
        verbose_name_plural = "Messaggi"

class Richiesta_messaggio (models.Model):
    cliente = models.ForeignKey(Cliente, on_delete = models.CASCADE) 
    messaggio = models.ForeignKey(Messaggi, on_delete = models.CASCADE)
    data_richiesta = models.DateTimeField(auto_now_add = True)  

    def __str__ (self):
        return str(self.cliente.pk) + " " + str(self.messaggio.pk) + " " + str(self.data_richiesta)
    

    class Meta:
        db_table = "Richiesta_messaggio"
        verbose_name_plural = "Richiesta_messaggi"



class Registrati(AbstractUser, AbstractBaseUser):
    email= models.EmailField(max_length=40, unique=True)
    cognome_ragione_sociale = models.CharField(max_length=50, blank=True, null=False)
    codiceFiscale_PartitaIVA= models.CharField(max_length=16)
    indirizzo = models.CharField(max_length=255, blank=True)
    citta = models.CharField(max_length=255, blank=True)
    telefono = PhoneNumberField(null=False, blank=True )
    #username = models.CharField(max_length=30, blank=True)
    
    REQUIRED_FIELDS = []
    USERNAME_FIELD = "email"

    def __str__ (self):
        return self.cognome_ragione_sociale + " " + self.codiceFiscale_PartitaIVA + " " + self.indirizzo + " " + self.citta

    class Meta:
        db_table = "Registrati"
        verbose_name_plural = "Registrati"

    def email_user(self) -> None:

        subject = "Email di benvenuto"

        message = "Ciao"+ self.first_name + "\n Ti ringraziamo per esserti registrato al nostro sito.\n"
        message = message + "Queste sono le tue credenziali per accedere al sito\n Username: " + self.email + "\nPassword: "+ self.password

        from_email = "info@saniscope-chimica.it"

        return super().email_user(subject, message, from_email)