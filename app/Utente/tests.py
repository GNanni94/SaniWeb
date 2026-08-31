from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .forms import ProfiloForm


class ProfiloFormTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.privato = User.objects.create_user(
            username="privato@example.com", email="privato@example.com", password="testpass123",
            first_name="Mario", cognome_ragione_sociale="Rossi",
            codiceFiscale_PartitaIVA="RSSMRA80A01H501U",
        )
        self.azienda = User.objects.create_user(
            username="azienda@example.com", email="azienda@example.com", password="testpass123",
            first_name="", cognome_ragione_sociale="Chimica SRL",
            codiceFiscale_PartitaIVA="12345678901",
        )

    def test_email_e_codice_fiscale_sono_sempre_disabilitati(self):
        form = ProfiloForm(instance=self.privato)
        self.assertTrue(form.fields["email"].disabled)
        self.assertTrue(form.fields["codiceFiscale_PartitaIVA"].disabled)
        self.assertFalse(form.fields["email"].required)
        self.assertFalse(form.fields["codiceFiscale_PartitaIVA"].required)

    def test_privato_ha_etichetta_cognome_e_nome_modificabile(self):
        form = ProfiloForm(instance=self.privato)
        self.assertEqual(form.fields["cognome_ragione_sociale"].label, "Cognome")
        self.assertFalse(form.fields["first_name"].disabled)

    def test_azienda_ha_etichetta_ragione_sociale_e_nome_disabilitato(self):
        form = ProfiloForm(instance=self.azienda)
        self.assertEqual(form.fields["cognome_ragione_sociale"].label, "Ragione sociale")
        self.assertTrue(form.fields["first_name"].disabled)


class ProfiloViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="utente@example.com", email="utente@example.com", password="testpass123",
            first_name="Luca", cognome_ragione_sociale="Bianchi",
            codiceFiscale_PartitaIVA="BNCLCU80A01H501U", citta="Roma",
        )
        self.altro_utente = User.objects.create_user(
            username="altro@example.com", email="altro@example.com", password="testpass123",
            first_name="Anna", cognome_ragione_sociale="Verdi",
        )
        self.azienda = User.objects.create_user(
            username="azienda2@example.com", email="azienda2@example.com", password="testpass123",
            first_name="", cognome_ragione_sociale="Sani SRL",
        )

    def test_richiede_login(self):
        response = self.client.get(reverse("profilo", args=[self.utente.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login"), response.url)

    def test_non_si_puo_aprire_il_profilo_di_un_altro_utente(self):
        # get_queryset() filtra per proprietario (vedi Utente/views.py:
        # Profilo.get_queryset) - senza quel filtro bastava cambiare il pk
        # nell'URL per modificare i dati di un altro cliente
        self.client.force_login(self.utente)
        response = self.client.get(reverse("profilo", args=[self.altro_utente.pk]))
        self.assertEqual(response.status_code, 404)

    def test_modifica_campi_consentiti(self):
        self.client.force_login(self.utente)
        response = self.client.post(reverse("profilo", args=[self.utente.pk]), {
            "first_name": "Luca",
            "cognome_ragione_sociale": "Bianchi",
            "indirizzo": "Via Roma 1",
            "citta": "Milano",
            "telefono": "3331234567",
        })
        self.assertRedirects(response, reverse("home"))
        self.utente.refresh_from_db()
        self.assertEqual(self.utente.citta, "Milano")
        self.assertEqual(self.utente.indirizzo, "Via Roma 1")

    def test_email_non_modificabile_anche_forzando_la_post(self):
        self.client.force_login(self.utente)
        self.client.post(reverse("profilo", args=[self.utente.pk]), {
            "email": "rubata@example.com",
            "first_name": "Luca",
            "cognome_ragione_sociale": "Bianchi",
            "citta": "Roma",
            "telefono": "",
        })
        self.utente.refresh_from_db()
        self.assertEqual(self.utente.email, "utente@example.com")

    def test_codice_fiscale_non_modificabile_anche_forzando_la_post(self):
        self.client.force_login(self.utente)
        self.client.post(reverse("profilo", args=[self.utente.pk]), {
            "codiceFiscale_PartitaIVA": "XXXXXXXXXXXXXXXX",
            "first_name": "Luca",
            "cognome_ragione_sociale": "Bianchi",
            "citta": "Roma",
            "telefono": "",
        })
        self.utente.refresh_from_db()
        self.assertEqual(self.utente.codiceFiscale_PartitaIVA, "BNCLCU80A01H501U")

    def test_nome_azienda_non_modificabile_anche_forzando_la_post(self):
        self.client.force_login(self.azienda)
        self.client.post(reverse("profilo", args=[self.azienda.pk]), {
            "first_name": "Mario",
            "cognome_ragione_sociale": "Sani SRL",
            "citta": "",
            "telefono": "",
        })
        self.azienda.refresh_from_db()
        self.assertEqual(self.azienda.first_name, "")

    def test_campo_nome_assente_dalla_pagina_per_le_aziende(self):
        self.client.force_login(self.azienda)
        response = self.client.get(reverse("profilo", args=[self.azienda.pk]))
        self.assertNotContains(response, 'id="id_first_name"')
        self.assertContains(response, "Ragione sociale")

    def test_campo_nome_presente_dalla_pagina_per_i_privati(self):
        self.client.force_login(self.utente)
        response = self.client.get(reverse("profilo", args=[self.utente.pk]))
        self.assertContains(response, 'id="id_first_name"')
        self.assertContains(response, "Cognome")


from .context_processors import form_login_popup
from .forms import CustomAuthenticationForm


class FormLoginPopupContextProcessorTest(TestCase):
    def test_espone_un_form_di_login_vuoto(self):
        request = self.client.get(reverse("home")).wsgi_request
        contesto = form_login_popup(request)
        self.assertIn("form_login_popup", contesto)
        self.assertIsInstance(contesto["form_login_popup"], CustomAuthenticationForm)
        self.assertFalse(contesto["form_login_popup"].is_bound)
