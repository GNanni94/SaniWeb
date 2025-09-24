from django.db import models
from Prodotti.models import Prodotto
from Utente.models import Registrati
import datetime


# Create your models here.
class Preventivo (models.Model):

    cliente = models.ForeignKey(Registrati, on_delete=models.CASCADE, related_name='ordini')
    data = models.DateTimeField(default = datetime.datetime.now)
    
    def __str__(self):
        return  str(self.pk)+ " "+ str(self.cliente.username)
    
    class Meta:
        db_table="Preventivo"
        verbose_name = "Preventivo"
        verbose_name_plural = 'Preventivi'

class Dettaglio_Preventivo(models.Model):

    x = [        
        ("inviato","inviato"),
        ("errore","errore"),
    ]
    preventivo = models.OneToOneField(Preventivo, on_delete=models.CASCADE, blank=True, related_name = 'dettaglio_preventivo')
    stato = models.TextField(choices=x, default="inviato")
    messaggio = models.TextField(max_length = 400, blank = True, null=True)
    luogo = models.CharField(max_length=40, blank=True, null=True)

    class Meta:
        db_table="Dettaglio Preventivo"
        verbose_name = "Dettaglio Preventivo"
        verbose_name_plural = 'Dettagli Preventivi'

    def __str__(self) -> str:
        return str(self.pk) + " " + str(self.preventivo.pk) 

class Elementi_Preventivo (models.Model):
    quantita = models.IntegerField(blank=False)
    prodotto = models.ForeignKey(Prodotto, on_delete = models.CASCADE)
    preventivo = models.ForeignKey(Preventivo, on_delete = models.CASCADE, related_name = 'elementi_preventivo')

    def __str__(self) -> str:
        return str(self.preventivo.pk) + " " + str(self.prodotto.codice_prodotto)+" " + str(self.quantita) 
    
    class Meta:
        db_table="Elemento_Preventivo"
        verbose_name = "Elemento_Preventivo"
        verbose_name_plural = 'Elementi_Preventivi'



