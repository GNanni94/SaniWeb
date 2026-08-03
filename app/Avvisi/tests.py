import datetime
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import DatabaseError
from django.test import TestCase
from django.urls import reverse

from .context_processors import avviso_chiusura
from .forms import AvvisoChiusuraForm
from .models import AvvisoChiusura


def _crea_avviso(data_inizio, data_fine, motivo="ferie estive", attivo=True):
    return AvvisoChiusura.objects.create(
        data_inizio=data_inizio,
        data_fine=data_fine,
        motivo_chiusura=motivo,
        attivo=attivo,
    )


class AvvisoChiusuraTestoTest(TestCase):
    def test_testo_preavviso_contiene_date_e_motivo(self):
        avviso = _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23), motivo="ferie estive")
        self.assertEqual(
            avviso.testo_preavviso(),
            "Avviso: l'azienda sarà chiusa dal 7 agosto al 23 agosto compresi per ferie estive.",
        )

    def test_testo_chiusura_contiene_date_motivo_e_frase_rientro(self):
        avviso = _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23), motivo="ferie estive")
        self.assertEqual(
            avviso.testo_chiusura(),
            "L'azienda è chiusa dal 7 agosto al 23 agosto compresi per ferie estive. "
            "Le richieste ricevute in questo periodo verranno gestite al nostro rientro.",
        )


class AvvisoChiusuraCorrenteTest(TestCase):
    def setUp(self):
        # La migrazione 0003 semina in modo permanente l'avviso reale delle
        # ferie estive 2026 (vedi AvvisoFerieEstive2026MigrationTest): questi
        # test verificano la logica di corrente() su scenari isolati e
        # devono quindi partire da una tabella vuota, indipendentemente dai
        # dati creati dalle migrazioni.
        AvvisoChiusura.objects.all().delete()

    def test_nessun_avviso_restituisce_none(self):
        fase, avviso = AvvisoChiusura.corrente(oggi=datetime.date(2026, 1, 1))
        self.assertIsNone(fase)
        self.assertIsNone(avviso)

    def test_oggi_dentro_intervallo_restituisce_chiusura(self):
        avviso = _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23))
        fase, scelto = AvvisoChiusura.corrente(oggi=datetime.date(2026, 8, 10))
        self.assertEqual(fase, "chiusura")
        self.assertEqual(scelto, avviso)

    def test_14_giorni_prima_restituisce_preavviso(self):
        avviso = _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23))
        fase, scelto = AvvisoChiusura.corrente(oggi=datetime.date(2026, 7, 24))
        self.assertEqual(fase, "preavviso")
        self.assertEqual(scelto, avviso)

    def test_15_giorni_prima_non_mostra_nulla(self):
        _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23))
        fase, scelto = AvvisoChiusura.corrente(oggi=datetime.date(2026, 7, 23))
        self.assertIsNone(fase)
        self.assertIsNone(scelto)

    def test_giorno_dopo_data_fine_non_mostra_nulla(self):
        _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23))
        fase, scelto = AvvisoChiusura.corrente(oggi=datetime.date(2026, 8, 24))
        self.assertIsNone(fase)
        self.assertIsNone(scelto)

    def test_avviso_disattivato_viene_ignorato(self):
        _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23), attivo=False)
        fase, scelto = AvvisoChiusura.corrente(oggi=datetime.date(2026, 8, 10))
        self.assertIsNone(fase)
        self.assertIsNone(scelto)

    def test_sovrapposizione_chiusura_vince_data_inizio_piu_vicina(self):
        _crea_avviso(datetime.date(2026, 8, 1), datetime.date(2026, 8, 31), motivo="vecchio")
        recente = _crea_avviso(datetime.date(2026, 8, 8), datetime.date(2026, 8, 20), motivo="recente")
        fase, scelto = AvvisoChiusura.corrente(oggi=datetime.date(2026, 8, 10))
        self.assertEqual(fase, "chiusura")
        self.assertEqual(scelto, recente)

    def test_chiusura_ha_priorita_su_preavviso(self):
        in_corso = _crea_avviso(datetime.date(2026, 8, 1), datetime.date(2026, 8, 31), motivo="in corso")
        _crea_avviso(datetime.date(2026, 9, 1), datetime.date(2026, 9, 10), motivo="futuro")
        fase, scelto = AvvisoChiusura.corrente(oggi=datetime.date(2026, 8, 20))
        self.assertEqual(fase, "chiusura")
        self.assertEqual(scelto, in_corso)


class AvvisoChiusuraIntegrazioneHomeTest(TestCase):
    def setUp(self):
        # Vedi commento in AvvisoChiusuraCorrenteTest.setUp: l'avviso reale
        # seminato dalla migrazione 0003 userebbe la data odierna reale e
        # falserebbe lo scenario "nessun avviso attivo".
        AvvisoChiusura.objects.all().delete()

    def test_banner_chiusura_visibile_se_avviso_in_corso(self):
        oggi = datetime.date.today()
        _crea_avviso(oggi - datetime.timedelta(days=1), oggi + datetime.timedelta(days=1))
        response = self.client.get(reverse('home'))
        # L'apostrofo in "L'azienda" viene sempre restituito da Django come
        # &#x27; (autoescape del template): si verifica quindi la parte di
        # testo dopo l'apostrofo, che comunque distingue univocamente la
        # fase "chiusura" (testo rosso) da "preavviso" ("sarà chiusa").
        self.assertContains(response, "azienda è chiusa dal")

    def test_nessun_banner_se_nessun_avviso_attivo(self):
        response = self.client.get(reverse('home'))
        self.assertNotContains(response, 'id="avvisoChiusura"')


class AvvisoChiusuraLinkNavbarTest(TestCase):
    def test_link_dashboard_visibile_per_utente_staff(self):
        User = get_user_model()
        staff = User.objects.create_user(username="staffuser", email="staff@example.com", password="testpass123", is_staff=True)
        self.client.force_login(staff)
        response = self.client.get(reverse('home'))
        self.assertContains(response, reverse('dashboard_admin'))

    def test_link_dashboard_non_visibile_per_utente_normale(self):
        User = get_user_model()
        utente = User.objects.create_user(username="utentenormale", email="utente@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.get(reverse('home'))
        self.assertNotContains(response, reverse('dashboard_admin'))


class AvvisoChiusuraGestionePageTest(TestCase):
    def test_pagina_visibile_per_utente_staff(self):
        User = get_user_model()
        staff = User.objects.create_user(username="staffuser2", email="staff2@example.com", password="testpass123", is_staff=True)
        avviso = AvvisoChiusura.objects.create(
            data_inizio=datetime.date(2026, 8, 7),
            data_fine=datetime.date(2026, 8, 23),
            motivo_chiusura="ferie estive",
        )
        self.client.force_login(staff)
        response = self.client.get(reverse('gestione_avvisi'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "ferie estive")

    def test_pagina_non_accessibile_per_utente_normale(self):
        User = get_user_model()
        utente = User.objects.create_user(username="utentenormale2", email="utente2@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.get(reverse('gestione_avvisi'))
        self.assertNotEqual(response.status_code, 200)

    def test_pagina_richiede_login_per_utente_anonimo(self):
        response = self.client.get(reverse('gestione_avvisi'))
        self.assertNotEqual(response.status_code, 200)


class AvvisoChiusuraContextProcessorFailSoftTest(TestCase):
    def test_errore_db_restituisce_nessun_avviso_senza_sollevare(self):
        with patch.object(AvvisoChiusura, "corrente", side_effect=DatabaseError("no such table")):
            contesto = avviso_chiusura(None)
        self.assertEqual(contesto, {"avviso_fase": None, "avviso_testo": None})


class AvvisoChiusuraValidazioneTest(TestCase):
    def test_data_fine_precedente_data_inizio_solleva_validation_error(self):
        avviso = AvvisoChiusura(
            data_inizio=datetime.date(2026, 8, 23),
            data_fine=datetime.date(2026, 8, 7),
            motivo_chiusura="ferie estive",
        )
        with self.assertRaises(ValidationError):
            avviso.full_clean()

    def test_date_valide_non_sollevano(self):
        avviso = AvvisoChiusura(
            data_inizio=datetime.date(2026, 8, 7),
            data_fine=datetime.date(2026, 8, 23),
            motivo_chiusura="ferie estive",
        )
        avviso.full_clean()


class AvvisoFerieEstive2026MigrationTest(TestCase):
    def test_record_ferie_estive_2026_creato_dalla_migrazione(self):
        self.assertTrue(
            AvvisoChiusura.objects.filter(
                data_inizio=datetime.date(2026, 8, 7),
                data_fine=datetime.date(2026, 8, 23),
                motivo_chiusura="ferie estive",
            ).exists()
        )


class AvvisoChiusuraFormTest(TestCase):
    def test_form_valido_con_dati_corretti(self):
        form = AvvisoChiusuraForm(data={
            "data_inizio": "2026-08-07",
            "data_fine": "2026-08-23",
            "motivo_chiusura": "ferie estive",
            # "attivo" omesso: una checkbox non spuntata non manda alcun
            # valore nel POST reale, il form deve comunque validare
            # (BooleanField del model genera un form field required=False)
        })
        self.assertTrue(form.is_valid(), form.errors)
        self.assertFalse(form.cleaned_data["attivo"])

    def test_form_non_valido_con_data_fine_precedente(self):
        form = AvvisoChiusuraForm(data={
            "data_inizio": "2026-08-23",
            "data_fine": "2026-08-07",
            "motivo_chiusura": "ferie estive",
            "attivo": "on",
        })
        self.assertFalse(form.is_valid())
        self.assertIn("data_fine", form.errors)


class NuovoAvvisoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username="staffcrud1", email="staffcrud1@example.com", password="testpass123", is_staff=True)
        self.utente = User.objects.create_user(username="normalecrud1", email="normalecrud1@example.com", password="testpass123")
        AvvisoChiusura.objects.all().delete()

    def test_post_valido_crea_avviso_e_risponde_con_tabella_aggiornata(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("nuovo_avviso"),
            data={"data_inizio": "2026-12-24", "data_fine": "2027-01-06", "motivo_chiusura": "festivita natalizie"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "festivita natalizie")
        self.assertTrue(AvvisoChiusura.objects.filter(motivo_chiusura="festivita natalizie").exists())

    def test_post_non_valido_non_crea_nulla_e_risponde_con_form_errori(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("nuovo_avviso"),
            data={"data_inizio": "2027-01-06", "data_fine": "2026-12-24", "motivo_chiusura": "festivita natalizie"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(AvvisoChiusura.objects.filter(motivo_chiusura="festivita natalizie").exists())

    def test_utente_normale_non_autorizzato(self):
        self.client.force_login(self.utente)
        response = self.client.post(reverse("nuovo_avviso"), data={}, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 302)

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("nuovo_avviso"))
        self.assertEqual(response.status_code, 405)

    def test_post_non_ajax_valido_reindirizza_a_gestione_avvisi(self):
        # Nessun header X-Requested-With: simula un form sottomesso come
        # navigazione vera (es. JS non caricato). Deve ricevere un
        # redirect alla pagina completa (POST-redirect-GET), non il
        # frammento nudo tabella_avvisi.html
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("nuovo_avviso"),
            data={"data_inizio": "2026-12-24", "data_fine": "2027-01-06", "motivo_chiusura": "festivita natalizie"},
        )
        self.assertRedirects(response, reverse("gestione_avvisi"))
        self.assertTrue(AvvisoChiusura.objects.filter(motivo_chiusura="festivita natalizie").exists())

    def test_post_non_ajax_non_valido_reindirizza_a_gestione_avvisi(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("nuovo_avviso"),
            data={"data_inizio": "2027-01-06", "data_fine": "2026-12-24", "motivo_chiusura": "festivita natalizie"},
        )
        self.assertRedirects(response, reverse("gestione_avvisi"))
        self.assertFalse(AvvisoChiusura.objects.filter(motivo_chiusura="festivita natalizie").exists())


class ModificaAvvisoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username="staffcrud2", email="staffcrud2@example.com", password="testpass123", is_staff=True)
        AvvisoChiusura.objects.all().delete()
        self.avviso = _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23))

    def test_post_valido_aggiorna_avviso_esistente(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_avviso", args=[self.avviso.pk]),
            data={"data_inizio": "2026-08-08", "data_fine": "2026-08-24", "motivo_chiusura": "ferie estive prolungate"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.avviso.refresh_from_db()
        self.assertEqual(self.avviso.motivo_chiusura, "ferie estive prolungate")
        self.assertEqual(self.avviso.data_inizio, datetime.date(2026, 8, 8))

    def test_post_non_valido_non_modifica_nulla(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_avviso", args=[self.avviso.pk]),
            data={"data_inizio": "2026-08-23", "data_fine": "2026-08-07", "motivo_chiusura": "x"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 400)
        self.avviso.refresh_from_db()
        self.assertEqual(self.avviso.motivo_chiusura, "ferie estive")

    def test_utente_normale_non_autorizzato(self):
        User = get_user_model()
        utente = User.objects.create_user(username="normalecrud2", email="normalecrud2@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.post(reverse("modifica_avviso", args=[self.avviso.pk]), data={}, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 302)

    def test_post_non_ajax_valido_reindirizza_a_gestione_avvisi(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_avviso", args=[self.avviso.pk]),
            data={"data_inizio": "2026-08-08", "data_fine": "2026-08-24", "motivo_chiusura": "ferie estive prolungate"},
        )
        self.assertRedirects(response, reverse("gestione_avvisi"))
        self.avviso.refresh_from_db()
        self.assertEqual(self.avviso.motivo_chiusura, "ferie estive prolungate")

    def test_post_non_ajax_non_valido_reindirizza_a_gestione_avvisi(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_avviso", args=[self.avviso.pk]),
            data={"data_inizio": "2026-08-23", "data_fine": "2026-08-07", "motivo_chiusura": "x"},
        )
        self.assertRedirects(response, reverse("gestione_avvisi"))
        self.avviso.refresh_from_db()
        self.assertEqual(self.avviso.motivo_chiusura, "ferie estive")

    def test_pk_inesistente_risponde_404(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_avviso", args=[999999]),
            data={"data_inizio": "2026-08-08", "data_fine": "2026-08-24", "motivo_chiusura": "x"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 404)

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("modifica_avviso", args=[self.avviso.pk]))
        self.assertEqual(response.status_code, 405)


class EliminaAvvisoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username="staffcrud3", email="staffcrud3@example.com", password="testpass123", is_staff=True)
        AvvisoChiusura.objects.all().delete()
        self.avviso = _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23))

    def test_post_elimina_avviso_e_risponde_con_tabella_aggiornata(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("elimina_avviso", args=[self.avviso.pk]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AvvisoChiusura.objects.filter(pk=self.avviso.pk).exists())
        self.assertNotContains(response, "ferie estive")

    def test_utente_normale_non_autorizzato(self):
        User = get_user_model()
        utente = User.objects.create_user(username="normalecrud3", email="normalecrud3@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.post(reverse("elimina_avviso", args=[self.avviso.pk]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(AvvisoChiusura.objects.filter(pk=self.avviso.pk).exists())

    def test_post_non_ajax_reindirizza_a_gestione_avvisi(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("elimina_avviso", args=[self.avviso.pk]))
        self.assertRedirects(response, reverse("gestione_avvisi"))
        self.assertFalse(AvvisoChiusura.objects.filter(pk=self.avviso.pk).exists())

    def test_pk_inesistente_risponde_404(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("elimina_avviso", args=[999999]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 404)

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("elimina_avviso", args=[self.avviso.pk]))
        self.assertEqual(response.status_code, 405)


class AvvisoChiusuraGestionePageContrattoJsTest(TestCase):
    # Guardia di regressione per il contratto tra il template e
    # gestione-avvisi.js: se uno di questi id/attributi data-* viene
    # rinominato in un file senza aggiornare l'altro, il popup si rompe
    # silenziosamente (nessun test Python lo segnalerebbe altrimenti, vedi
    # il bug "Modifica non apre il modal" gia' capitato in questo progetto)
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username="staffcontratto", email="staffcontratto@example.com", password="testpass123", is_staff=True)
        AvvisoChiusura.objects.all().delete()
        _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23))

    def test_pagina_contiene_id_ed_attributi_richiesti_dal_js(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("gestione_avvisi"))
        self.assertEqual(response.status_code, 200)
        stringhe_richieste = [
            'id="tabella-avvisi"',
            'id="modalAvviso"',
            'id="modalAvvisoBody"',
            'id="btnNuovoAvviso"',
            'id="form-avviso"',
            'data-data-inizio="',
            'data-data-fine="',
            'data-motivo="',
            'data-attivo="',
            'data-url-modifica="',
            'data-url-elimina="',
            'data-azione-nuovo="',
            'toggle-attivo-avviso',
            'data-url-toggle="',
        ]
        for stringa in stringhe_richieste:
            self.assertContains(response, stringa)


class ToggleAvvisoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username="stafftoggle", email="stafftoggle@example.com", password="testpass123", is_staff=True)
        AvvisoChiusura.objects.all().delete()
        self.avviso = _crea_avviso(datetime.date(2026, 8, 7), datetime.date(2026, 8, 23), attivo=True)

    def test_post_inverte_attivo_da_true_a_false(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("toggle_avviso", args=[self.avviso.pk]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 200)
        self.avviso.refresh_from_db()
        self.assertFalse(self.avviso.attivo)

    def test_post_inverte_attivo_da_false_a_true(self):
        self.avviso.attivo = False
        self.avviso.save()
        self.client.force_login(self.staff)
        response = self.client.post(reverse("toggle_avviso", args=[self.avviso.pk]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 200)
        self.avviso.refresh_from_db()
        self.assertTrue(self.avviso.attivo)

    def test_utente_normale_non_autorizzato(self):
        User = get_user_model()
        utente = User.objects.create_user(username="normaletoggle", email="normaletoggle@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.post(reverse("toggle_avviso", args=[self.avviso.pk]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 302)
        self.avviso.refresh_from_db()
        self.assertTrue(self.avviso.attivo)

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("toggle_avviso", args=[self.avviso.pk]))
        self.assertEqual(response.status_code, 405)

    def test_pk_sconosciuto_risponde_404(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("toggle_avviso", args=[99999]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 404)

    def test_post_non_ajax_fa_redirect_a_gestione_avvisi(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("toggle_avviso", args=[self.avviso.pk]))
        self.assertRedirects(response, reverse("gestione_avvisi"))
