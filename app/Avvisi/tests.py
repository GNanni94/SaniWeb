import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

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
    def test_link_admin_visibile_per_utente_staff(self):
        User = get_user_model()
        staff = User.objects.create_user(username="staffuser", email="staff@example.com", password="testpass123", is_staff=True)
        self.client.force_login(staff)
        response = self.client.get(reverse('home'))
        self.assertContains(response, reverse('admin:Avvisi_avvisochiusura_changelist'))

    def test_link_admin_non_visibile_per_utente_normale(self):
        User = get_user_model()
        utente = User.objects.create_user(username="utentenormale", email="utente@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.get(reverse('home'))
        self.assertNotContains(response, reverse('admin:Avvisi_avvisochiusura_changelist'))
