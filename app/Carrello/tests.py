from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase
from django.urls import reverse

from Prodotti.models import Categoria, Prodotto

from .context_processors import carrello_ha_prodotti
from .models import Carrello


class CarrelloHaProdottiContextProcessorTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="utenteflottante", email="utenteflottante@example.com", password="testpass123"
        )
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")
        # Prodotto.save() e' sovrascritto (vedi Prodotti/models.py) e non
        # chiama super().save() se "sottocategoriaGestionale" e' None:
        # bulk_create bypassa .save() e scrive comunque la riga, stesso
        # pattern gia' usato in Pagine/tests.py
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="F001", nome_prodotto="Sapone liquido", unita_di_misura="LT", categoria=self.categoria),
        ])
        self.prodotto = Prodotto.objects.get(codice_prodotto="F001")
        self.factory = RequestFactory()

    def test_utente_anonimo_non_ha_prodotti(self):
        request = self.factory.get("/")
        request.user = AnonymousUser()

        contesto = carrello_ha_prodotti(request)

        self.assertEqual(contesto, {
            "carrello_ha_prodotti": False,
            "elementi_carrello_utente": [],
            "totale_elementi_carrello": 0,
        })

    def test_utente_con_prodotti_nel_carrello(self):
        Carrello.objects.create(cliente=self.utente, prodotto=self.prodotto, quantita=3)
        request = self.factory.get("/")
        request.user = self.utente

        contesto = carrello_ha_prodotti(request)

        self.assertTrue(contesto["carrello_ha_prodotti"])
        self.assertEqual(contesto["totale_elementi_carrello"], 3)
        self.assertEqual(len(contesto["elementi_carrello_utente"]), 1)
        self.assertEqual(contesto["elementi_carrello_utente"][0].prodotto, self.prodotto)

    def test_utente_senza_prodotti_nel_carrello(self):
        request = self.factory.get("/")
        request.user = self.utente

        contesto = carrello_ha_prodotti(request)

        self.assertFalse(contesto["carrello_ha_prodotti"])
        self.assertEqual(contesto["totale_elementi_carrello"], 0)
        self.assertEqual(list(contesto["elementi_carrello_utente"]), [])
