from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

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

    def test_non_azienda_vede_il_popup_di_avviso_dopo_il_redirect(self):
        preventivo = self._crea_preventivo_con_entrambi_i_prodotti(self.privato)
        self.client.force_login(self.privato)

        response = self.client.get(reverse("aggiungi_preventivo_al_carrello", args=[preventivo.pk]), follow=True)

        self.assertContains(response, 'id="modalAvvisoPrecursore"')
        self.assertContains(response, 'non sono stati aggiunti al carrello')

    def test_anonimo_redirect_a_login_con_next(self):
        # Regressione: il redirect al login perdeva la pagina di provenienza
        # ("return redirect('login')" senza "next"), riportando l'utente
        # sempre alla home dopo il login invece che alla pagina "Riusa
        # preventivo" da cui era partita l'azione (stesso bug di
        # Carrello/views.py:aggiungi_prodotti_al_carrello)
        preventivo = self._crea_preventivo_con_entrambi_i_prodotti(self.privato)

        url = reverse("aggiungi_preventivo_al_carrello", args=[preventivo.pk])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 302)
        self.assertIn(f"next={url}", response.url)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class CreaOrdineDaCarrelloConPrecursoreTest(TestCase):
    # Regressione: una riga di carrello con precursore rimasta da prima
    # dell'introduzione del controllo (o comunque presente per qualunque
    # motivo) poteva comunque diventare un preventivo/ordine vero per un
    # cliente non azienda, perche' crea_ordine_da_carrello convertiva
    # l'intero carrello senza controllare puo_vedere_precursori. Questo e' il
    # punto di enforcement scelto (la transazione, non la visualizzazione
    # o il singolo aggiungi-al-carrello) - vedi design del 2026-08-18.
    def setUp(self):
        categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="P800",
                nome_prodotto="Prodotto Con Precursore",
                unita_di_misura="LT",
                categoria=categoria,
                precursore="documenti/Regolamento-2019-1148_esplosivi.pdf",
            ),
            Prodotto(
                codice_prodotto="P801",
                nome_prodotto="Prodotto Senza Precursore",
                unita_di_misura="LT",
                categoria=categoria,
            ),
        ])
        self.prodotto_precursore = Prodotto.objects.get(codice_prodotto="P800")
        self.prodotto_normale = Prodotto.objects.get(codice_prodotto="P801")

        User = get_user_model()
        self.privato = User.objects.create_user(
            username="privatoordine@example.com", email="privatoordine@example.com", password="testpass123",
            first_name="Mario", cognome_ragione_sociale="Rossi",
            codiceFiscale_PartitaIVA="RSSMRA80A01H501U", telefono="3331234567",
        )
        # Riga di carrello "preesistente" (simula un prodotto con precursore
        # finito nel carrello prima del controllo su aggiungi_prodotti_al_carrello)
        Carrello.objects.create(cliente=self.privato, prodotto=self.prodotto_precursore, quantita=1)
        Carrello.objects.create(cliente=self.privato, prodotto=self.prodotto_normale, quantita=2)

    def test_ordine_non_include_il_prodotto_con_precursore_e_il_carrello_si_svuota(self):
        self.client.force_login(self.privato)

        self.client.post(reverse("crea_ordine"), {"messaggio": "Test", "luogo": "Test"})

        preventivo = Preventivo.objects.get(cliente=self.privato)
        prodotti_ordinati = set(preventivo.elementi_preventivo.values_list("prodotto__codice_prodotto", flat=True))
        self.assertEqual(prodotti_ordinati, {"P801"})
        self.assertFalse(Carrello.objects.filter(cliente=self.privato).exists())

    def test_email_allo_staff_non_elenca_il_prodotto_con_precursore_scartato(self):
        # Altrimenti lo staff, leggendo l'email, potrebbe evadere comunque
        # manualmente un prodotto con precursore che l'ordine vero non
        # contiene piu' - un canale laterale che aggirerebbe il blocco
        self.client.force_login(self.privato)

        self.client.post(reverse("crea_ordine"), {"messaggio": "Test", "luogo": "Test"})

        self.assertEqual(len(mail.outbox), 1)
        corpo_email = mail.outbox[0].body
        self.assertNotIn("P800", corpo_email)
        self.assertIn("P801", corpo_email)

    def test_non_azienda_vede_il_popup_di_avviso_dopo_il_redirect(self):
        self.client.force_login(self.privato)

        response = self.client.post(reverse("crea_ordine"), {"messaggio": "Test", "luogo": "Test"}, follow=True)

        self.assertContains(response, 'id="modalAvvisoPrecursore"')
        self.assertContains(response, 'non sono stati inclusi nella richiesta')

    def test_azienda_ottiene_entrambi_i_prodotti_nell_ordine(self):
        Carrello.objects.filter(cliente=self.privato).delete()
        User = get_user_model()
        azienda = User.objects.create_user(
            username="aziendaordine@example.com", email="aziendaordine@example.com", password="testpass123",
            first_name="", cognome_ragione_sociale="Chimica SRL",
            codiceFiscale_PartitaIVA="12345678901", telefono="3331234567",
        )
        Carrello.objects.create(cliente=azienda, prodotto=self.prodotto_precursore, quantita=1)
        Carrello.objects.create(cliente=azienda, prodotto=self.prodotto_normale, quantita=2)
        self.client.force_login(azienda)

        self.client.post(reverse("crea_ordine"), {"messaggio": "Test", "luogo": "Test"})

        preventivo = Preventivo.objects.get(cliente=azienda)
        prodotti_ordinati = set(preventivo.elementi_preventivo.values_list("prodotto__codice_prodotto", flat=True))
        self.assertEqual(prodotti_ordinati, {"P800", "P801"})


class PreventivoModelTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.cliente = User.objects.create_user(
            username="modeltestpreventivo@example.com", email="modeltestpreventivo@example.com", password="testpass123",
            first_name="Test", cognome_ragione_sociale="Cliente",
            codiceFiscale_PartitaIVA="TSTCLN80A01H510U",
        )

    def test_data_ha_default_timezone_aware(self):
        preventivo = Preventivo.objects.create(cliente=self.cliente)
        self.assertFalse(timezone.is_naive(preventivo.data))


class DettaglioPreventivoModelTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.cliente = User.objects.create_user(
            username="modeltestdettaglio@example.com", email="modeltestdettaglio@example.com", password="testpass123",
            first_name="Test", cognome_ragione_sociale="Cliente",
            codiceFiscale_PartitaIVA="TSTCLN80A01H511U",
        )
        self.preventivo = Preventivo.objects.create(cliente=self.cliente)

    def test_preventivo_e_obbligatorio(self):
        dettaglio = Dettaglio_Preventivo(messaggio="", luogo="")
        with self.assertRaises(ValidationError):
            dettaglio.full_clean()

    def test_messaggio_oltre_400_caratteri_non_valido(self):
        dettaglio = Dettaglio_Preventivo(preventivo=self.preventivo, messaggio="a" * 401, luogo="")
        with self.assertRaises(ValidationError):
            dettaglio.full_clean()

    def test_messaggio_di_esattamente_400_caratteri_valido(self):
        dettaglio = Dettaglio_Preventivo(preventivo=self.preventivo, messaggio="a" * 400, luogo="")
        dettaglio.full_clean()


class ElementiPreventivoModelTest(TestCase):
    def setUp(self):
        categoria = Categoria.objects.create(nome_categoria="TestModelli")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="MODELTEST1", nome_prodotto="Prodotto Test Modelli",
                unita_di_misura="LT", categoria=categoria,
            ),
        ])
        self.prodotto = Prodotto.objects.get(codice_prodotto="MODELTEST1")
        User = get_user_model()
        self.cliente = User.objects.create_user(
            username="modeltestelementi@example.com", email="modeltestelementi@example.com", password="testpass123",
            first_name="Test", cognome_ragione_sociale="Cliente",
            codiceFiscale_PartitaIVA="TSTCLN80A01H512U",
        )
        self.preventivo = Preventivo.objects.create(cliente=self.cliente)

    def test_quantita_zero_non_valida(self):
        elemento = Elementi_Preventivo(preventivo=self.preventivo, prodotto=self.prodotto, quantita=0)
        with self.assertRaises(ValidationError):
            elemento.full_clean()

    def test_quantita_negativa_non_valida(self):
        elemento = Elementi_Preventivo(preventivo=self.preventivo, prodotto=self.prodotto, quantita=-3)
        with self.assertRaises(ValidationError):
            elemento.full_clean()

    def test_quantita_uno_e_valida(self):
        elemento = Elementi_Preventivo(preventivo=self.preventivo, prodotto=self.prodotto, quantita=1)
        elemento.full_clean()

    def test_stesso_prodotto_due_volte_nello_stesso_preventivo_viola_il_vincolo(self):
        Elementi_Preventivo.objects.create(preventivo=self.preventivo, prodotto=self.prodotto, quantita=1)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Elementi_Preventivo.objects.create(preventivo=self.preventivo, prodotto=self.prodotto, quantita=2)

    def test_related_name_da_prodotto_a_elementi_preventivo(self):
        elemento = Elementi_Preventivo.objects.create(preventivo=self.preventivo, prodotto=self.prodotto, quantita=1)
        self.assertIn(elemento, self.prodotto.elementi_preventivo.all())
