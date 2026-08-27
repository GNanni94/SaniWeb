import os
import tempfile
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from SitoWeb import settings as sitoweb_settings
from .models import Categoria, Prodotto, Sottocategoria, ImmaginiArticolo, DEFAULT_IMMAGINE_ARTICOLO
from .views import ConfiguraImmaginiArticoli, configuraImmagini


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

    def test_ricerca_senza_risultati_torna_a_mostrare_lintera_categoria(self):
        # La griglia non resta vuota (niente piu' paginazione "rotta" per
        # via delle variabili di contesto mancanti): torna a mostrare tutti
        # i prodotti della categoria, con gli attributi che permettono al
        # JS (filtro-prodotti-ajax.js) di avvisare l'utente con un toast
        url = reverse('search_prodotto', args=[self.categoria.pk])
        response = self.client.get(url, {'query': 'xyznonesiste'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-ricerca-senza-risultati="1"')
        self.assertContains(response, 'data-messaggio-ricerca-senza-risultati="Non è presente nessun prodotto &quot;xyznonesiste&quot;."')
        self.assertContains(response, "Sgrassatore Cucina")

    def test_ricerca_con_risultati_non_segnala_ricerca_senza_risultati(self):
        url = reverse('search_prodotto', args=[self.categoria.pk])
        response = self.client.get(url, {'query': 'Sgrassatore'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertContains(response, 'data-ricerca-senza-risultati=""')


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


class ConfiguraImmaginiTest(TestCase):
    # Regressione per il bug C2 della review finale: configuraImmagini()
    # scansionava os.getcwd() + "/media/immagini_articoli/" invece di
    # settings.MEDIA_ROOT (che punta a mediafiles/), quindi lo script di
    # sincronizzazione non trovava mai i file caricati manualmente e li
    # sovrascriveva silenziosamente con il placeholder.
    #
    # Nota: Prodotti/views.py importa le settings con
    # "from SitoWeb import settings" (il modulo grezzo, non
    # django.conf.settings), quindi @override_settings non ha effetto su
    # settings.MEDIA_ROOT com'e' visto da configuraImmagini() - va
    # patchato direttamente l'attributo sul modulo SitoWeb.settings.
    def test_configura_immagini_legge_da_media_root_non_da_cwd(self):
        media_root = tempfile.mkdtemp()

        categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C901",
                nome_prodotto="Prodotto sincronizzazione",
                unita_di_misura="LT",
                categoria=categoria,
            ),
        ])
        prodotto = Prodotto.objects.get(codice_prodotto="C901")
        ImmaginiArticolo.objects.create(articolo=prodotto, immagine=DEFAULT_IMMAGINE_ARTICOLO)

        cartella_immagini = os.path.join(media_root, "immagini_articoli")
        os.makedirs(cartella_immagini, exist_ok=True)
        with open(os.path.join(cartella_immagini, "C901.jpg"), "wb") as f:
            f.write(b"contenuto finto, il nome file e' l'unica cosa che conta qui")

        with mock.patch.object(sitoweb_settings, "MEDIA_ROOT", media_root):
            configuraImmagini()

        immagine_articolo = ImmaginiArticolo.objects.get(articolo=prodotto)
        self.assertEqual(immagine_articolo.immagine.name, "/media/immagini_articoli/C901.jpg")


class ProdottoOrdinamentoDefaultTest(TestCase):
    # Regressione: senza un ordinamento di default sul modello, la
    # paginazione (Paginator, usata da CatalogoListView/SottocategoriaListView
    # per elencare i prodotti di una categoria) non ha alcuna garanzia di
    # ordine consistente tra una query e l'altra (PostgreSQL puo' scegliere
    # piani diversi per una query con LIMIT rispetto a una senza) - un
    # prodotto puo' quindi risultare assente dalla pagina attesa pur
    # esistendo nella categoria. Riprodotto in produzione con la categoria
    # "carta": il prodotto D0071 (9° per codice_prodotto) non compariva in
    # pagina 1 (paginate_by=9) nonostante ci stesse per posizione.
    def test_prodotto_ha_ordinamento_di_default_per_codice(self):
        self.assertEqual(Prodotto._meta.ordering, ['codice_prodotto'])

    def test_dettaglio_categoria_elenca_i_prodotti_in_ordine_di_codice(self):
        categoria = Categoria.objects.create(nome_categoria="Carta")
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="D0192", nome_prodotto="Prodotto Ultimo", unita_di_misura="PZ", categoria=categoria),
            Prodotto(codice_prodotto="D0057", nome_prodotto="Prodotto Primo", unita_di_misura="PZ", categoria=categoria),
        ])
        response = self.client.get(reverse('dettaglio_categoria', args=[categoria.pk]))
        contenuto = response.content.decode()
        self.assertLess(contenuto.index("Prodotto Primo"), contenuto.index("Prodotto Ultimo"))


class ProdottiPrecursoreVisibilitaTest(TestCase):
    # Regressione per la richiesta: gli utenti anonimi devono vedere nel
    # catalogo anche i prodotti soggetti alla normativa precursori; se
    # invece effettuano il login con un account che non e' un'azienda,
    # quegli stessi prodotti devono sparire. Staff/superuser/azienda li
    # vedono sempre, loggati o meno.
    def setUp(self):
        self.categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C700",
                nome_prodotto="Prodotto Con Precursore",
                unita_di_misura="LT",
                categoria=self.categoria,
                precursore="documenti/Regolamento-2019-1148_esplosivi.pdf",
            ),
        ])
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

    def test_utente_anonimo_vede_il_prodotto_con_precursore(self):
        response = self.client.get(reverse('dettaglio_categoria', args=[self.categoria.pk]))
        self.assertContains(response, "Prodotto Con Precursore")

    def test_utente_loggato_non_azienda_non_vede_il_prodotto_con_precursore(self):
        self.client.force_login(self.privato)
        response = self.client.get(reverse('dettaglio_categoria', args=[self.categoria.pk]))
        self.assertNotContains(response, "Prodotto Con Precursore")

    def test_utente_azienda_vede_il_prodotto_con_precursore(self):
        self.client.force_login(self.azienda)
        response = self.client.get(reverse('dettaglio_categoria', args=[self.categoria.pk]))
        self.assertContains(response, "Prodotto Con Precursore")
