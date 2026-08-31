import re

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
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


class CustomLoginViewAjaxTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="login@example.com", email="login@example.com", password="testpass123",
            first_name="Login", cognome_ragione_sociale="Test",
        )

    def test_login_ajax_con_credenziali_corrette_restituisce_il_dropdown_profilo(self):
        response = self.client.post(
            reverse("login"),
            {"username": "login@example.com", "password": "testpass123"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "dropdownUser1")
        self.assertContains(response, "login@example.com")

    def test_login_ajax_con_credenziali_corrette_effettua_davvero_il_login(self):
        self.client.post(
            reverse("login"),
            {"username": "login@example.com", "password": "testpass123"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        response = self.client.get(reverse("profilo", args=[self.utente.pk]))
        self.assertEqual(response.status_code, 200)

    def test_login_ajax_con_credenziali_sbagliate_restituisce_400_col_form(self):
        response = self.client.post(
            reverse("login"),
            {"username": "login@example.com", "password": "sbagliata"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 400)
        self.assertContains(response, 'id="form-login"', status_code=400)

    def test_login_senza_ajax_continua_a_fare_redirect(self):
        response = self.client.post(
            reverse("login"),
            {"username": "login@example.com", "password": "testpass123"},
        )
        self.assertEqual(response.status_code, 302)


class ModalLoginNelDomTest(TestCase):
    """
    Fix (review finale, whole-branch): il modal di login in base.html deve
    esistere nel DOM solo per un utente anonimo. Se esistesse anche per un
    utente gia' autenticato, e la sua sessione scadesse a meta' visita (es.
    in un'altra scheda), un login riuscito nel popup inserirebbe un SECONDO
    dropdown profilo (id="dropdownUser1" duplicato) accanto a quello gia'
    renderizzato per la pagina - vedi partials/dropdown_profilo_navbar.html.
    """

    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="modal@example.com", email="modal@example.com", password="testpass123",
            first_name="Modal", cognome_ragione_sociale="Test",
        )

    def test_anonimo_vede_il_modal_di_login_nel_dom(self):
        response = self.client.get(reverse("home"))
        self.assertContains(response, 'id="modalLogin"')

    def test_autenticato_non_vede_il_modal_di_login_nel_dom(self):
        self.client.force_login(self.utente)
        response = self.client.get(reverse("home"))
        self.assertNotContains(response, 'id="modalLogin"')
        # Un solo dropdown profilo: se il modal fosse comunque presente,
        # dopo un ipotetico login nel popup ce ne sarebbero due
        self.assertEqual(response.content.decode().count('id="dropdownUser1"'), 1)


class LoginNextFieldTest(TestCase):
    """
    Fix (review finale): il partial form_login.html ha ora un "action"
    esplicito ("{% url 'login' %}", aggiunto per farlo funzionare anche
    incluso nel modal su pagine diverse da "/login/"). Effetto collaterale:
    un fallimento POSTa su "/login/" nudo, perdendo la query string
    "?next=..." che era nell'URL originale - il campo nascosto "next" deve
    quindi leggere dalla variabile di contesto "next" (popolata da
    LoginView.get_context_data() via get_redirect_url(), che controlla sia
    POST che GET), non da "request.GET.next".
    """

    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="next@example.com", email="next@example.com", password="testpass123",
            first_name="Next", cognome_ragione_sociale="Test",
        )

    def test_get_con_next_popola_il_campo_nascosto(self):
        response = self.client.get(reverse("login") + "?next=" + reverse("carrello"))
        self.assertContains(response, 'name="next" value="' + reverse("carrello") + '"')

    def test_dopo_un_fallimento_next_sopravvive_nel_form_ripresentato(self):
        # Il form POSTa su "/login/" bare (niente querystring): "next" deve
        # arrivare dal campo nascosto gia' presente nel corpo POST (che il
        # browser invia comunque, essendo parte del form), non da
        # request.GET, che qui e' vuoto
        response = self.client.post(reverse("login"), {
            "username": "next@example.com",
            "password": "sbagliata",
            "next": reverse("carrello"),
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="next" value="' + reverse("carrello") + '"')

    def test_login_riuscito_rispetta_next_arrivato_solo_dal_campo_nascosto(self):
        response = self.client.post(reverse("login"), {
            "username": "next@example.com",
            "password": "testpass123",
            "next": reverse("carrello"),
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("carrello"))

    def test_fuori_da_login_il_campo_next_resta_vuoto_come_prima(self):
        # Sulle altre pagine il modal include form_login.html con
        # "form_login_popup" (Utente/context_processors.py), che non passa
        # mai una variabile "next": deve restare vuoto, non un NameError/
        # errore di rendering
        response = self.client.get(reverse("home"))
        self.assertContains(response, 'name="next" value=""')


class CsrfRotationDopoLoginModaleTest(TestCase):
    """
    Fix (review finale): django.contrib.auth.login() chiama rotate_token()
    (verificato leggendo django/contrib/auth/__init__.py nel container),
    che cambia il segreto CSRF. Prima di questa feature il login ricaricava
    sempre la pagina intera, quindi ogni form ripartiva con un token
    fresco; ora un login nel popup non ricarica nulla, quindi il JS deve
    ricopiare il token nuovo (letto dal frammento dropdown_profilo_navbar.html,
    Fix su quel partial) in tutti gli altri campi csrfmiddlewaretoken gia'
    presenti sulla pagina - altrimenti il loro prossimo submit fallisce con
    403. Questo test usa un client con enforce_csrf_checks=True (niente
    bypass del CSRF, a differenza del client di default) per verificare che
    il vecchio token sia davvero rifiutato e il nuovo davvero accettato.
    """

    def setUp(self):
        User = get_user_model()
        self.utente = User.objects.create_user(
            username="csrf@example.com", email="csrf@example.com", password="testpass123",
            first_name="Csrf", cognome_ragione_sociale="Test",
        )
        self.client = Client(enforce_csrf_checks=True)

    def _estrai_token(self, contenuto):
        match = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', contenuto)
        self.assertIsNotNone(match, "nessun csrfmiddlewaretoken trovato nella risposta")
        return match.group(1)

    def test_login_ajax_ruota_il_token_e_il_frammento_riflette_quello_nuovo(self):
        # GET iniziale (anonimo): prende il cookie CSRF (il segreto NON
        # mascherato) e un token di form valido (mascherato, ma decodifica
        # allo stesso segreto)
        risposta_get = self.client.get(reverse("home"))
        token_prima = self._estrai_token(risposta_get.content.decode())
        segreto_prima = self.client.cookies["csrftoken"].value

        # Login vero e proprio via il ramo AJAX (stesso path usato dal
        # popup), con lo stesso token appena letto - esattamente come farebbe
        # login-modal.js leggendolo dal campo nascosto del form
        risposta_login = self.client.post(
            reverse("login"),
            {
                "username": "csrf@example.com",
                "password": "testpass123",
                "csrfmiddlewaretoken": token_prima,
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(risposta_login.status_code, 200)

        # 1) il frammento di successo contiene davvero un token (non e'
        # stato dimenticato nel partial)
        self.assertContains(risposta_login, 'name="csrfmiddlewaretoken"')
        token_dopo = self._estrai_token(risposta_login.content.decode())

        # 2) rotate_token() ha davvero cambiato il segreto: confrontare i
        # token mascherati non basterebbe (il mascheramento e' casuale ad
        # ogni chiamata, quindi cambierebbe comunque anche senza rotazione)
        # - il cookie CSRF contiene invece il segreto non mascherato, quindi
        # e' la prova diretta che la rotazione e' avvenuta
        segreto_dopo = self.client.cookies["csrftoken"].value
        self.assertNotEqual(segreto_prima, segreto_dopo)

        # 3) il VECCHIO token (valido prima del login) e' ora rifiutato
        risposta_vecchio_token = self.client.post(
            reverse("logout"), {"csrfmiddlewaretoken": token_prima},
        )
        self.assertEqual(risposta_vecchio_token.status_code, 403)

        # 4) il NUOVO token (quello nel frammento appena tornato, quello che
        # login-modal.js ricopia negli altri form della pagina) e' invece
        # accettato
        risposta_nuovo_token = self.client.post(
            reverse("logout"), {"csrfmiddlewaretoken": token_dopo},
        )
        self.assertNotEqual(risposta_nuovo_token.status_code, 403)
