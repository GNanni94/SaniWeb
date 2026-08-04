from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from Prodotti.models import Categoria, ImmaginiArticolo, Prodotto, Sottocategoria, DEFAULT_IMMAGINE_ARTICOLO


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

    def test_prodotto_con_immagine_stringa_vuota_compare_in_lista(self):
        # Regressione per il bug I2 della review finale: se il salvataggio
        # del file si interrompe a meta' (es. disco pieno), la riga
        # ImmaginiArticolo sopravvive con immagine='' - ne' isnull=True
        # ne' uguale al placeholder, quindi il prodotto restava
        # permanentemente invisibile in questa lista pur mostrando
        # un'immagine rotta ovunque nel sito.
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C023", nome_prodotto="Detergente multiuso", unita_di_misura="LT", categoria=self.categoria),
        ])
        prodotto = Prodotto.objects.get(codice_prodotto="C023")
        ImmaginiArticolo.objects.create(articolo=prodotto, immagine="")
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Detergente multiuso")

    def test_prodotto_con_immagine_null_compare_in_lista(self):
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C024", nome_prodotto="Brillantante lavastoviglie", unita_di_misura="LT", categoria=self.categoria),
        ])
        prodotto = Prodotto.objects.get(codice_prodotto="C024")
        ImmaginiArticolo.objects.create(articolo=prodotto, immagine=None)
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Brillantante lavastoviglie")

    def test_lista_vuota_mostra_messaggio(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Nessun prodotto senza immagine.")

    def test_categoria_e_sottocategoria_compaiono_in_lista(self):
        sottocategoria = Sottocategoria(
            nome_sottocategoria="Sgrassatori", categoria=self.categoria, codice_sottocategoria=101
        )
        Sottocategoria.objects.bulk_create([sottocategoria])
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C025",
                nome_prodotto="Sgrassatore universale",
                unita_di_misura="LT",
                categoria=self.categoria,
                sottocategoria=sottocategoria,
            ),
        ])
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, '<th scope="col">Categoria</th>')
        self.assertContains(response, "Sgrassatori")

    def test_prodotto_senza_categoria_ne_sottocategoria_mostra_trattino(self):
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C026", nome_prodotto="Prodotto senza categoria", unita_di_misura="LT"),
        ])
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Prodotto senza categoria")
        self.assertEqual(response.content.decode().count("<td>-</td>"), 2)


import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

GIF_1PX = (
    b'GIF87a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff\x21\xf9'
    b'\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00'
    b'\x02\x02\x44\x01\x00\x3b'
)

# Immagine BMP 1x1 valida (Pillow la riconosce e la valida correttamente
# come immagine), usata per verificare che i formati fuori dall'allowlist
# di estensioni consentite (I1) vengano rifiutati anche se il contenuto e'
# un'immagine genuina.
BMP_1PX = (
    b'BM:\x00\x00\x00\x00\x00\x00\x006\x00\x00\x00\x28\x00\x00\x00\x01'
    b'\x00\x00\x00\x01\x00\x00\x00\x01\x00\x18\x00\x00\x00\x00\x00\x04'
    b'\x00\x00\x00\xc4\x0e\x00\x00\xc4\x0e\x00\x00\x00\x00\x00\x00\x00'
    b'\x00\x00\x00\x00\x00\xff\x00'
)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class CaricaImmagineProdottoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffimg1", email="staffimg1@example.com", password="testpass123", is_staff=True
        )
        self.utente = User.objects.create_user(
            username="normaleimg1", email="normaleimg1@example.com", password="testpass123"
        )
        categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C010", nome_prodotto="Sgrassatore", unita_di_misura="LT", categoria=categoria),
        ])
        self.prodotto = Prodotto.objects.get(codice_prodotto="C010")

    def test_anonimo_reindirizzato_al_login(self):
        file = SimpleUploadedFile("foto.gif", GIF_1PX, content_type="image/gif")
        response = self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": file},
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith(reverse("login")))

    def test_upload_valido_rinomina_il_file_e_crea_immaginiarticolo(self):
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("foto_qualsiasi.gif", GIF_1PX, content_type="image/gif")
        response = self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": file},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})
        immagine_articolo = ImmaginiArticolo.objects.get(articolo=self.prodotto)
        self.assertEqual(immagine_articolo.immagine.name, "/media/immagini_articoli/C010.gif")

    def test_secondo_upload_sovrascrive_e_mantiene_il_nome_esatto(self):
        self.client.force_login(self.staff)
        primo_file = SimpleUploadedFile("primo.gif", GIF_1PX, content_type="image/gif")
        self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": primo_file},
        )
        secondo_file = SimpleUploadedFile("secondo.gif", GIF_1PX, content_type="image/gif")
        response = self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": secondo_file},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})
        immagine_articolo = ImmaginiArticolo.objects.get(articolo=self.prodotto)
        self.assertEqual(immagine_articolo.immagine.name, "/media/immagini_articoli/C010.gif")

    def test_upload_valido_il_src_nella_griglia_prodotti_e_un_percorso_assoluto_media(self):
        # Regressione per il bug C1 della review finale: i template che
        # mostrano l'immagine prodotto (griglia_prodotti.html,
        # carrello.html, dettaglio_preventivo.html) stampano il valore
        # del campo direttamente senza `.url` - se il nome salvato resta
        # il nome relativo standard di Django (es.
        # "immagini_articoli/C010.gif") l'<img src="..."> risultante non
        # si risolve in un URL valido e l'immagine non viene mai
        # visualizzata sul sito.
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("foto_qualsiasi.gif", GIF_1PX, content_type="image/gif")
        self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": file},
        )
        categoria = self.prodotto.categoria
        response = self.client.get(
            reverse("search_prodotto", args=[categoria.pk]),
            {"query": "C010"},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        contenuto = response.content.decode()
        inizio_src = contenuto.index('src="') + len('src="')
        src = contenuto[inizio_src:contenuto.index('"', inizio_src)]
        self.assertTrue(src.startswith("/media/"), f"src inatteso: {src!r}")

    def test_upload_formato_non_supportato_risponde_400_e_non_crea_nulla(self):
        # BMP e' un formato che Pillow valida correttamente come immagine
        # ma che non fa parte dell'allowlist di estensioni consentite -
        # deve essere rifiutato con lo stesso contratto JSON usato per
        # l'errore di validazione, non salvato con un'estensione derivata
        # dal nome file fornito dal client.
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("foto.bmp", BMP_1PX, content_type="image/bmp")
        response = self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": file},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["ok"], False)
        self.assertFalse(ImmaginiArticolo.objects.filter(articolo=self.prodotto).exists())

    def test_upload_file_non_immagine_risponde_400_e_non_crea_nulla(self):
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("documento.txt", b"non e' un'immagine", content_type="text/plain")
        response = self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": file},
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ImmaginiArticolo.objects.filter(articolo=self.prodotto).exists())

    def test_utente_normale_non_autorizzato(self):
        self.client.force_login(self.utente)
        file = SimpleUploadedFile("foto.gif", GIF_1PX, content_type="image/gif")
        response = self.client.post(
            reverse("carica_immagine_prodotto", args=[self.prodotto.pk]),
            data={"immagine": file},
        )
        self.assertRedirects(response, reverse("home"))

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("carica_immagine_prodotto", args=[self.prodotto.pk]))
        self.assertEqual(response.status_code, 405)

    def test_pk_sconosciuto_risponde_404(self):
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("foto.gif", GIF_1PX, content_type="image/gif")
        response = self.client.post(
            reverse("carica_immagine_prodotto", args=[999999]),
            data={"immagine": file},
        )
        self.assertEqual(response.status_code, 404)


class DashboardProdottiSenzaImmagineContrattoJsTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdash3", email="staffdash3@example.com", password="testpass123", is_staff=True
        )
        categoria = Categoria.objects.create(nome_categoria="Detersivi")
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C030", nome_prodotto="Detergente vetri", unita_di_misura="LT", categoria=categoria),
        ])

    def test_markup_richiesto_dal_js_e_presente(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, 'id="corpo-tabella-prodotti-senza-immagine"')
        self.assertContains(response, 'id="tabella-prodotti-senza-immagine"')
        self.assertContains(response, 'id="messaggio-nessun-prodotto"')
        self.assertContains(response, 'id="csrf-dashboard-prodotti"')
        self.assertContains(response, 'data-url-carica="')
        self.assertContains(response, 'data-codice="')
        self.assertContains(response, 'data-nome="')
        self.assertContains(response, 'id="modalCaricaImmagineProdotto"')
        self.assertContains(response, 'id="modalCaricaImmagineProdottoTitolo"')
        self.assertContains(response, 'id="modalCaricaImmagineProdottoInfo"')
        self.assertContains(response, 'id="inputImmagineProdottoModal"')
        self.assertContains(response, 'id="btnScegliImmagineProdotto"')
        self.assertContains(response, 'id="previewImmagineProdottoContainer"')
        self.assertContains(response, 'id="previewImmagineProdotto"')
        self.assertContains(response, 'id="erroreCaricaImmagineProdotto"')
        self.assertContains(response, 'id="btnConfermaCaricaImmagineProdotto"')
        self.assertContains(response, 'dashboard-prodotti-immagini.js')


class DashboardAdminViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdash1", email="staffdash1@example.com", password="testpass123", is_staff=True
        )
        self.utente = User.objects.create_user(
            username="normaledash1", email="normaledash1@example.com", password="testpass123"
        )

    def test_anonimo_reindirizzato_al_login(self):
        response = self.client.get(reverse("dashboard_admin"))
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith(reverse("login")))

    def test_utente_normale_reindirizzato_alla_home(self):
        self.client.force_login(self.utente)
        response = self.client.get(reverse("dashboard_admin"))
        self.assertRedirects(response, reverse("home"))

    def test_staff_vede_le_due_card(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_admin"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, reverse("gestione_avvisi"))
        self.assertContains(response, reverse("dashboard_prodotti_senza_immagine"))


class DashboardIconNavbarTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffnav1", email="staffnav1@example.com", password="testpass123", is_staff=True
        )
        self.utente = User.objects.create_user(
            username="normalenav1", email="normalenav1@example.com", password="testpass123"
        )

    def test_icona_dashboard_visibile_per_staff(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("home"))
        self.assertContains(response, reverse("dashboard_admin"))

    def test_icona_dashboard_non_visibile_per_utente_normale(self):
        self.client.force_login(self.utente)
        response = self.client.get(reverse("home"))
        self.assertNotContains(response, reverse("dashboard_admin"))

    def test_icone_sincronizzazione_e_gestione_avvisi_non_sono_piu_dirette(self):
        # Le due icone dirette sono state sostituite dall'icona unica:
        # sincronizzazione non e' piu' raggiungibile dal dropdown (resta
        # raggiungibile solo dalla pagina prodotti-senza-immagine), e il
        # link ad avvisi passa ora dalla dashboard
        self.client.force_login(self.staff)
        response = self.client.get(reverse("home"))
        self.assertNotContains(response, reverse("sincronizzazione"))
