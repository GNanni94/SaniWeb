from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from Prodotti.models import Categoria, ImmaginiArticolo, Prodotto, DEFAULT_IMMAGINE_ARTICOLO


class DashboardProdottiSenzaImmagineViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdash2", email="staffdash2@example.com", password="testpass123", is_staff=True
        )
        self.utente = User.objects.create_user(
            username="normaledash2", email="normaledash2@example.com", password="testpass123"
        )
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")

    def test_anonimo_reindirizzato_al_login(self):
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith(reverse("login")))

    def test_utente_normale_reindirizzato_alla_home(self):
        self.client.force_login(self.utente)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertRedirects(response, reverse("home"))

    def test_prodotto_senza_riga_immaginiarticolo_compare_in_lista(self):
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C020", nome_prodotto="Detergente pavimenti", unita_di_misura="LT", categoria=self.categoria),
        ])
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Detergente pavimenti")

    def test_prodotto_con_immagine_placeholder_compare_in_lista(self):
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C021", nome_prodotto="Sgrassatore forte", unita_di_misura="LT", categoria=self.categoria),
        ])
        prodotto = Prodotto.objects.get(codice_prodotto="C021")
        ImmaginiArticolo.objects.create(articolo=prodotto, immagine=DEFAULT_IMMAGINE_ARTICOLO)
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Sgrassatore forte")

    def test_prodotto_con_immagine_propria_non_compare_in_lista(self):
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C022", nome_prodotto="Igienizzante superfici", unita_di_misura="LT", categoria=self.categoria),
        ])
        prodotto = Prodotto.objects.get(codice_prodotto="C022")
        ImmaginiArticolo.objects.create(articolo=prodotto, immagine="/media/immagini_articoli/C022.jpg")
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertNotContains(response, "Igienizzante superfici")

    def test_lista_vuota_mostra_messaggio(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Nessun prodotto senza immagine.")
