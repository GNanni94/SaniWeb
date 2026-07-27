import datetime

from django.db import models
from django.utils import timezone
from django.utils.formats import date_format

GIORNI_PREAVVISO = 14


class AvvisoChiusura(models.Model):
    data_inizio = models.DateField()
    data_fine = models.DateField()
    motivo_chiusura = models.CharField(max_length=200)
    attivo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Avviso di chiusura"
        verbose_name_plural = "Avvisi di chiusura"

    def __str__(self):
        return f"{self.motivo_chiusura} ({self.data_inizio} - {self.data_fine})"

    def _intervallo_testo(self):
        return "dal {} al {} compresi".format(
            date_format(self.data_inizio, "j F").lower(),
            date_format(self.data_fine, "j F").lower(),
        )

    def testo_preavviso(self):
        return "Avviso: l'azienda sarà chiusa {} per {}.".format(
            self._intervallo_testo(), self.motivo_chiusura
        )

    def testo_chiusura(self):
        return (
            "L'azienda è chiusa {} per {}. "
            "Le richieste ricevute in questo periodo verranno gestite al nostro rientro."
        ).format(self._intervallo_testo(), self.motivo_chiusura)

    @classmethod
    def corrente(cls, oggi=None):
        if oggi is None:
            oggi = timezone.localdate()

        candidati_chiusura = []
        candidati_preavviso = []
        for avviso in cls.objects.filter(attivo=True):
            if avviso.data_inizio <= oggi <= avviso.data_fine:
                candidati_chiusura.append(avviso)
            elif avviso.data_inizio - datetime.timedelta(days=GIORNI_PREAVVISO) <= oggi < avviso.data_inizio:
                candidati_preavviso.append(avviso)

        if candidati_chiusura:
            scelto = min(candidati_chiusura, key=lambda a: abs((a.data_inizio - oggi).days))
            return "chiusura", scelto
        if candidati_preavviso:
            scelto = min(candidati_preavviso, key=lambda a: abs((a.data_inizio - oggi).days))
            return "preavviso", scelto
        return None, None
