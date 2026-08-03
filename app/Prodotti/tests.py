from django.test import TestCase
from django.urls import reverse

from .models import Categoria, Prodotto, Sottocategoria, ImmaginiArticolo, DEFAULT_IMMAGINE_ARTICOLO
from .views import ConfiguraImmaginiArticoli


class ProdottiCardGrigliaTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")
        # bulk_create bypassa il Prodotto.save() personalizzato - vedi nota
        # a inizio piano sul perche' e' necessario
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C001",
                nome_prodotto="Sgrassatore Extra",
                unita_di_misura="LT",
                categoria=self.categoria,
            ),
        ])
        self.prodotto = Prodotto.objects.get(codice_prodotto="C001")

    def test_dettaglio_categoria_mostra_il_prodotto_nel_nuovo_container(self):
        response = self.client.get(reverse('dettaglio_categoria', args=[self.categoria.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sgrassatore Extra")
        self.assertContains(response, 'id="listaProdottiContainer"')

    def test_richiesta_normale_restituisce_la_pagina_intera(self):
        response = self.client.get(reverse('dettaglio_categoria', args=[self.categoria.pk]))
        self.assertContains(response, 'site-footer')

    def test_richiesta_ajax_su_categoria_restituisce_solo_il_partial(self):
        response = self.client.get(
            reverse('dettaglio_categoria', args=[self.categoria.pk]),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sgrassatore Extra")
        self.assertContains(response, 'id="listaProdottiContainer"')
        self.assertNotContains(response, 'site-footer')


class ProdottiCardGrigliaSottocategoriaTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")
        # bulk_create bypassa anche Sottocategoria.save() - vedi nota a
        # inizio piano
        Sottocategoria.objects.bulk_create([
            Sottocategoria(nome_sottocategoria="Superfici", categoria=self.categoria, codice_sottocategoria=1),
        ])
        self.sottocategoria = Sottocategoria.objects.get(codice_sottocategoria=1)
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C002",
                nome_prodotto="Detergente Pavimenti",
                unita_di_misura="LT",
                categoria=self.categoria,
                sottocategoria=self.sottocategoria,
            ),
        ])

    def test_richiesta_ajax_su_sottocategoria_restituisce_solo_il_partial(self):
        url = reverse('dettaglio_sottocategoria', args=[self.categoria.pk, self.sottocategoria.codice_sottocategoria])
        response = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Detergente Pavimenti")
        self.assertContains(response, 'id="listaProdottiContainer"')
        self.assertNotContains(response, 'site-footer')


class ProdottiCardGrigliaRicercaTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C003",
                nome_prodotto="Sgrassatore Cucina",
                unita_di_misura="LT",
                categoria=self.categoria,
            ),
        ])

    def test_richiesta_ajax_su_ricerca_restituisce_solo_il_partial(self):
        url = reverse('search_prodotto', args=[self.categoria.pk])
        response = self.client.get(url, {'query': 'Sgrassatore'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sgrassatore Cucina")
        self.assertContains(response, 'id="listaProdottiContainer"')
        self.assertNotContains(response, 'site-footer')


class ConfiguraImmaginiArticoliTest(TestCase):
    def test_placeholder_usa_la_costante_condivisa(self):
        categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C900",
                nome_prodotto="Prodotto di test",
                unita_di_misura="LT",
                categoria=categoria,
            ),
        ])
        prodotto = Prodotto.objects.get(codice_prodotto="C900")

        ConfiguraImmaginiArticoli()

        immagine_articolo = ImmaginiArticolo.objects.get(articolo=prodotto)
        self.assertEqual(immagine_articolo.immagine.name, DEFAULT_IMMAGINE_ARTICOLO)
