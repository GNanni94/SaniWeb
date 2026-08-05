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


class CarrelloFlottanteWidgetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="utenteflottante2", email="utenteflottante2@example.com", password="testpass123"
        )
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="F002", nome_prodotto="Detergente multiuso", unita_di_misura="LT", categoria=self.categoria),
        ])
        self.prodotto = Prodotto.objects.get(codice_prodotto="F002")

    def test_widget_assente_se_carrello_vuoto(self):
        self.client.force_login(self.utente)
        response = self.client.get(reverse("home"))
        self.assertNotContains(response, 'id="carrelloFlottante"')

    def test_widget_presente_se_carrello_ha_prodotti(self):
        Carrello.objects.create(cliente=self.utente, prodotto=self.prodotto, quantita=2)
        self.client.force_login(self.utente)
        response = self.client.get(reverse("home"))
        self.assertContains(response, 'id="carrelloFlottante"')
        self.assertContains(response, "Detergente multiuso")

    def test_widget_assente_sulla_pagina_carrello(self):
        Carrello.objects.create(cliente=self.utente, prodotto=self.prodotto, quantita=2)
        self.client.force_login(self.utente)
        response = self.client.get(reverse("carrello"))
        self.assertNotContains(response, 'id="carrelloFlottante"')


class CarrelloFlottanteAjaxViewsTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="utenteflottante3", email="utenteflottante3@example.com", password="testpass123"
        )
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="F003", nome_prodotto="Sgrassatore forte", unita_di_misura="LT", categoria=self.categoria),
        ])
        self.prodotto = Prodotto.objects.get(codice_prodotto="F003")
        self.client.force_login(self.utente)

    def test_aggiungi_con_ajax_restituisce_widget_aggiornato(self):
        response = self.client.get(
            reverse("aggiungi_prodotti", args=[self.prodotto.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sgrassatore forte")
        self.assertContains(response, 'id="badgeCarrelloFlottante"')

    def test_aggiungi_senza_ajax_continua_a_fare_redirect(self):
        response = self.client.get(reverse("aggiungi_prodotti", args=[self.prodotto.pk]))
        self.assertEqual(response.status_code, 302)

    def test_elimina_con_ajax_restituisce_widget_vuoto(self):
        elemento = Carrello.objects.create(cliente=self.utente, prodotto=self.prodotto, quantita=1)
        response = self.client.post(
            reverse("elimina_prodotti", args=[elemento.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'id="carrelloFlottante"')

    def test_elimina_senza_ajax_continua_a_fare_redirect(self):
        elemento = Carrello.objects.create(cliente=self.utente, prodotto=self.prodotto, quantita=1)
        response = self.client.post(reverse("elimina_prodotti", args=[elemento.pk]))
        self.assertRedirects(response, reverse("carrello"))

    def test_aumenta_con_ajax_restituisce_quantita_aggiornata(self):
        elemento = Carrello.objects.create(cliente=self.utente, prodotto=self.prodotto, quantita=1)
        response = self.client.post(
            reverse("aumenta_quantita", args=[elemento.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, ">2<")
        elemento.refresh_from_db()
        self.assertEqual(elemento.quantita, 2)

    def test_diminuisci_con_ajax_sotto_1_rimuove_e_svuota_widget(self):
        elemento = Carrello.objects.create(cliente=self.utente, prodotto=self.prodotto, quantita=1)
        response = self.client.post(
            reverse("diminuisci_quantita", args=[elemento.pk]),
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'id="carrelloFlottante"')
        self.assertFalse(Carrello.objects.filter(pk=elemento.pk).exists())
