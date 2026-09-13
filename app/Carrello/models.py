from django.core.validators import MinValueValidator
from django.db import models
from Prodotti.models import Prodotto
from Utente.models import Registrati

class Carrello (models.Model):
    cliente = models.ForeignKey(Registrati, on_delete=models.CASCADE, related_name='elementi_carrello')
    prodotto = models.ForeignKey(Prodotto, on_delete=models.CASCADE, related_name='elementi_carrello')
    quantita = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(1)])

    def __str__(self) -> str:
        return str(self.prodotto)
    
    class Meta:
        db_table="Carrello"
        verbose_name = "Carrello"
        verbose_name_plural ="Carrelli"
        # Ordina le righe per id di inserimento
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["cliente", "prodotto"], name="vincolo_unico_cliente_prodotto"),
        ]