from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from Carrello.models import Carrello
from Prodotti.models import Categoria, Prodotto

from .models import Dettaglio_Preventivo, Elementi_Preventivo, Preventivo


class AggiungiPreventivoAlCarrelloConPrecursoreTest(TestCase):
    # Regressione: "Riusa preventivo" re-inseriva nel carrello tutti gli
    # elementi di un vecchio preventivo dell'utente, inclusi quelli con
    # precursore, anche per un cliente non azienda - bypassando cosi' il
    # blocco appena aggiunto in Carrello/views.py:aggiungi_prodotti_al_carrello
    # (vedi review finale del 2026-08-18 sulla visibilita' dei precursori
    # agli anonimi).
    def setUp(self):
        categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="P700",
                nome_prodotto="Prodotto Con Precursore",
                unita_di_misura="LT",
                categoria=categoria,
                precursore="documenti/Regolamento-2019-1148_esplosivi.pdf",
            ),
            Prodotto(
                codice_prodotto="P701",
                nome_prodotto="Prodotto Senza Precursore",
                unita_di_misura="LT",
                categoria=categoria,
            ),
        ])
        self.prodotto_precursore = Prodotto.objects.get(codice_prodotto="P700")
        self.prodotto_normale = Prodotto.objects.get(codice_prodotto="P701")

        User = get_user_model()
        self.privato = User.objects.create_user(
            username="privatopreventivo@example.com", email="privatopreventivo@example.com", password="testpass123",
            first_name="Mario", cognome_ragione_sociale="Rossi",
            codiceFiscale_PartitaIVA="RSSMRA80A01H501U",
        )
        self.azienda = User.objects.create_user(
            username="aziendapreventivo@example.com", email="aziendapreventivo@example.com", password="testpass123",
            first_name="", cognome_ragione_sociale="Chimica SRL",
            codiceFiscale_PartitaIVA="12345678901",
        )

    def _crea_preventivo_con_entrambi_i_prodotti(self, cliente):
        preventivo = Preventivo.objects.create(cliente=cliente)
        Dettaglio_Preventivo.objects.create(preventivo=preventivo, messaggio="", luogo="")
        Elementi_Preventivo.objects.create(preventivo=preventivo, prodotto=self.prodotto_precursore, quantita=1)
        Elementi_Preventivo.objects.create(preventivo=preventivo, prodotto=self.prodotto_normale, quantita=2)
        return preventivo

    def test_non_azienda_non_riottiene_il_prodotto_con_precursore(self):
        preventivo = self._crea_preventivo_con_entrambi_i_prodotti(self.privato)
        self.client.force_login(self.privato)

        self.client.get(reverse("aggiungi_preventivo_al_carrello", args=[preventivo.pk]))

        self.assertFalse(Carrello.objects.filter(cliente=self.privato, prodotto=self.prodotto_precursore).exists())
        self.assertTrue(Carrello.objects.filter(cliente=self.privato, prodotto=self.prodotto_normale).exists())

    def test_azienda_riottiene_entrambi_i_prodotti(self):
        preventivo = self._crea_preventivo_con_entrambi_i_prodotti(self.azienda)
        self.client.force_login(self.azienda)

        self.client.get(reverse("aggiungi_preventivo_al_carrello", args=[preventivo.pk]))

        self.assertTrue(Carrello.objects.filter(cliente=self.azienda, prodotto=self.prodotto_precursore).exists())
        self.assertTrue(Carrello.objects.filter(cliente=self.azienda, prodotto=self.prodotto_normale).exists())
