from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from Prodotti.models import Prodotto
from Utente.models import Registrati


# Create your models here.
class Preventivo (models.Model):

    cliente = models.ForeignKey(Registrati, on_delete=models.CASCADE, related_name='ordini')
    data = models.DateTimeField(default = timezone.now)
    
    def __str__(self):
        return  str(self.pk)+ " "+ str(self.cliente.username)
    
    class Meta:
        db_table="Preventivo"
        verbose_name = "Preventivo"
        verbose_name_plural = 'Preventivi'
        ordering = ["-data"]

class Dettaglio_Preventivo(models.Model):

    STATO_CHOICES = [
        ("inviato","inviato"),
        ("errore","errore"),
    ]
    preventivo = models.OneToOneField(Preventivo, on_delete=models.CASCADE, related_name = 'dettaglio_preventivo')
    stato = models.TextField(choices=STATO_CHOICES, default="inviato")
    messaggio = models.CharField(max_length = 400, blank = True, null=True)
    luogo = models.CharField(max_length=40, blank=True, null=True)

    class Meta:
        db_table="Dettaglio_Preventivo"
        verbose_name = "Dettaglio Preventivo"
        verbose_name_plural = 'Dettagli Preventivi'

    def __str__(self) -> str:
        return str(self.pk) + " " + str(self.preventivo.pk) 

class Elementi_Preventivo (models.Model):
    quantita = models.PositiveSmallIntegerField(blank=False, validators=[MinValueValidator(1)])
    prodotto = models.ForeignKey(Prodotto, on_delete = models.CASCADE, related_name = 'elementi_preventivo')
    preventivo = models.ForeignKey(Preventivo, on_delete = models.CASCADE, related_name = 'elementi_preventivo')

    def __str__(self) -> str:
        return str(self.preventivo.pk) + " " + str(self.prodotto.codice_prodotto)+" " + str(self.quantita) 
    
    class Meta:
        db_table="Elementi_Preventivo"
        verbose_name = "Elemento_Preventivo"
        verbose_name_plural = 'Elementi_Preventivi'
        constraints = [
            models.UniqueConstraint(fields=["preventivo", "prodotto"], name="vincolo_unico_preventivo_prodotto"),
        ]



