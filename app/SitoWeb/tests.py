import datetime
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .context_processors import avviso_chiusura


def _aware(y, m, d, hh, mm):
    return timezone.make_aware(datetime.datetime(y, m, d, hh, mm))


class AvvisoChiusuraContextProcessorTest(TestCase):
    @patch('django.utils.timezone.now')
    def test_prima_del_7_agosto_mostra_preavviso(self, mock_now):
        mock_now.return_value = _aware(2026, 8, 6, 23, 59)
        self.assertEqual(avviso_chiusura(None), {'avviso_chiusura': 'preavviso'})

    @patch('django.utils.timezone.now')
    def test_dal_7_agosto_00_01_mostra_chiusura(self, mock_now):
        mock_now.return_value = _aware(2026, 8, 7, 0, 1)
        self.assertEqual(avviso_chiusura(None), {'avviso_chiusura': 'chiusura'})

    @patch('django.utils.timezone.now')
    def test_23_agosto_sera_mostra_ancora_chiusura(self, mock_now):
        mock_now.return_value = _aware(2026, 8, 23, 23, 59)
        self.assertEqual(avviso_chiusura(None), {'avviso_chiusura': 'chiusura'})

    @patch('django.utils.timezone.now')
    def test_dal_24_agosto_00_01_nessun_avviso(self, mock_now):
        mock_now.return_value = _aware(2026, 8, 24, 0, 1)
        self.assertEqual(avviso_chiusura(None), {'avviso_chiusura': None})


class AvvisoChiusuraIntegrationTest(TestCase):
    def test_pagina_home_mostra_il_banner_corretto_secondo_la_data_odierna(self):
        response = self.client.get(reverse('home'))
        stato = avviso_chiusura(None)['avviso_chiusura']
        if stato == 'preavviso':
            self.assertContains(response, "sarà chiusa dal 7 al 23 agosto")
        elif stato == 'chiusura':
            self.assertContains(response, "è chiusa dal 7 al 23 agosto")
        else:
            self.assertNotContains(response, "23 agosto")
