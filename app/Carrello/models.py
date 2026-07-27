from django.db import models
from Prodotti.models import Prodotto
from Utente.models import Registrati

# Create your models here.

class Carrello (models.Model):
    cliente = models.ForeignKey(Registrati, on_delete=models.CASCADE, related_name='elementi_carrello')
    prodotto = models.ForeignKey(Prodotto, on_delete=models.CASCADE)
    quantita = models.IntegerField(default=0)

    def __str__(self) -> str:
        return str(self.prodotto)
    
    class Meta:
        db_table="Carrello"
        verbose_name = "Carrello"
        verbose_name_plural ="Carrelli"
        # senza un ordinamento esplicito l'ordine non e' garantito: in
        # Postgres un UPDATE (es. "Aggiorna quantita") crea una nuova
        # versione fisica della riga che finisce spesso in fondo allo heap,
        # facendo apparire il prodotto aggiornato come ultimo nel carrello
        ordering = ["id"]