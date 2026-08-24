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

    def test_prodotto_chimico_gruppo_zero_non_compare_in_lista(self):
        categoria_chimici = Categoria.objects.create(nome_categoria="Prodotti Chimici")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C027",
                nome_prodotto="Chimico gruppo zero",
                unita_di_misura="LT",
                categoria=categoria_chimici,
                gruppo=0,
            ),
        ])
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertNotContains(response, "Chimico gruppo zero")

    def test_prodotto_chimico_gruppo_vuoto_non_compare_in_lista(self):
        categoria_chimici = Categoria.objects.create(nome_categoria="Prodotti Chimici")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C029",
                nome_prodotto="Chimico gruppo vuoto",
                unita_di_misura="LT",
                categoria=categoria_chimici,
                gruppo=None,
            ),
        ])
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertNotContains(response, "Chimico gruppo vuoto")

    def test_prodotto_chimico_gruppo_diverso_da_zero_compare_in_lista(self):
        categoria_chimici = Categoria.objects.create(nome_categoria="Prodotti Chimici")
        Prodotto.objects.bulk_create([
            Prodotto(
                codice_prodotto="C028",
                nome_prodotto="Chimico gruppo uno",
                unita_di_misura="LT",
                categoria=categoria_chimici,
                gruppo=1,
            ),
        ])
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Chimico gruppo uno")

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
        self.assertContains(response, 'id="colonnaCategoria"')
        self.assertContains(response, "Sgrassatori")

    def test_prodotto_senza_categoria_ne_sottocategoria_mostra_trattino(self):
        Prodotto.objects.bulk_create([
            Prodotto(codice_prodotto="C026", nome_prodotto="Prodotto senza categoria", unita_di_misura="LT"),
        ])
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, "Prodotto senza categoria")
        # Colonna Categoria: cella semplice. Sottocategoria: nascosta sotto i
        # 576px ("d-none d-sm-table-cell", vedi dashboard_prodotti_senza_immagine.html)
        self.assertContains(response, "<td>-</td>", count=1)
        self.assertContains(response, '<td class="d-none d-sm-table-cell">-</td>', count=1)


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
        self.assertContains(response, 'data-unita-di-misura="')
        self.assertContains(response, 'data-descrizione="')
        self.assertContains(response, 'id="modalCaricaImmagineProdotto"')
        self.assertContains(response, 'id="modalCaricaImmagineProdottoTitolo"')
        self.assertContains(response, 'id="inputImmagineProdottoModal"')
        self.assertContains(response, 'id="btnScegliImmagineProdotto"')
        self.assertContains(response, 'id="previewProdottoCodice"')
        self.assertContains(response, 'id="previewProdottoUnita"')
        self.assertContains(response, 'id="previewProdottoTitolo"')
        self.assertContains(response, 'id="previewProdottoDescrizione"')
        self.assertContains(response, 'id="previewImmagineProdotto"')
        self.assertContains(response, 'data-default-src="')
        self.assertContains(response, 'id="colonnaCodice"')
        self.assertContains(response, 'id="colonnaCategoria"')
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

    def test_staff_vede_le_tre_card(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("dashboard_admin"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, reverse("gestione_avvisi"))
        self.assertContains(response, reverse("dashboard_prodotti_senza_immagine"))
        self.assertContains(response, reverse("gestione_documenti"))


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


import os
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from .forms import DocumentoForm
from .models import CategoriaFile, File

PDF_MINIMO = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"


def _crea_categoria_file(nome="Certificazioni"):
    return CategoriaFile.objects.create(nome_categoria=nome)


def _crea_documento(nome_file="Certificato qualita", categoria=None):
    if categoria is None:
        categoria = _crea_categoria_file()
    file = SimpleUploadedFile("certificato.pdf", PDF_MINIMO, content_type="application/pdf")
    return File.objects.create(nome_file=nome_file, categoria=categoria, file=file)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class DocumentoFormTest(TestCase):
    def setUp(self):
        self.categoria = _crea_categoria_file()

    def test_form_valido_con_categoria_esistente(self):
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        form = DocumentoForm(
            data={"nome_file": "Politica qualita", "categoria": self.categoria.pk},
            files={"file": file},
        )
        self.assertTrue(form.is_valid(), form.errors)

    def test_form_valido_con_categoria_nuova_la_crea(self):
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        form = DocumentoForm(
            data={"nome_file": "Politica qualita", "categoria": "", "categoria_nuova": "Normative"},
            files={"file": file},
        )
        self.assertTrue(form.is_valid(), form.errors)
        documento = form.save()
        self.assertEqual(documento.categoria.nome_categoria, "Normative")

    def test_categoria_nuova_gia_esistente_case_insensitive_non_duplica(self):
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        form = DocumentoForm(
            data={"nome_file": "Politica qualita", "categoria": "", "categoria_nuova": "certificazioni"},
            files={"file": file},
        )
        self.assertTrue(form.is_valid(), form.errors)
        documento = form.save()
        self.assertEqual(documento.categoria_id, self.categoria.pk)
        self.assertEqual(CategoriaFile.objects.count(), 1)

    def test_nessuna_categoria_ne_nuova_non_valido(self):
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        form = DocumentoForm(
            data={"nome_file": "Politica qualita", "categoria": ""},
            files={"file": file},
        )
        self.assertFalse(form.is_valid())
        self.assertIn("categoria_nuova", form.errors)

    def test_nome_file_vuoto_non_valido(self):
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        form = DocumentoForm(
            data={"nome_file": "", "categoria": self.categoria.pk},
            files={"file": file},
        )
        self.assertFalse(form.is_valid())
        self.assertIn("nome_file", form.errors)

    def test_file_non_pdf_rifiutato_anche_con_estensione_pdf(self):
        # Stessa rigidita' gia' usata per le immagini prodotto
        # (carica_immagine_prodotto): il contenuto va validato sui byte
        # veri, non fidandosi del nome file/estensione forniti dal client
        file = SimpleUploadedFile("doc.pdf", b"non e' un pdf", content_type="application/pdf")
        form = DocumentoForm(
            data={"nome_file": "Politica qualita", "categoria": self.categoria.pk},
            files={"file": file},
        )
        self.assertFalse(form.is_valid())
        self.assertIn("file", form.errors)

    def test_modifica_senza_nuovo_file_mantiene_quello_esistente(self):
        documento = _crea_documento(categoria=self.categoria)
        nome_file_originale = documento.file.name
        form = DocumentoForm(
            data={"nome_file": "Nome aggiornato", "categoria": self.categoria.pk},
            files={},
            instance=documento,
        )
        self.assertTrue(form.is_valid(), form.errors)
        aggiornato = form.save()
        self.assertEqual(aggiornato.file.name, nome_file_originale)
        self.assertEqual(aggiornato.nome_file, "Nome aggiornato")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class GestioneDocumentiViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdoc1", email="staffdoc1@example.com", password="testpass123", is_staff=True
        )
        self.utente = User.objects.create_user(
            username="normaledoc1", email="normaledoc1@example.com", password="testpass123"
        )

    def test_anonimo_reindirizzato_al_login(self):
        response = self.client.get(reverse("gestione_documenti"))
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith(reverse("login")))

    def test_utente_normale_reindirizzato_alla_home(self):
        self.client.force_login(self.utente)
        response = self.client.get(reverse("gestione_documenti"))
        self.assertRedirects(response, reverse("home"))

    def test_pagina_visibile_per_staff_e_mostra_i_documenti(self):
        _crea_documento(nome_file="Certificato ISO")
        self.client.force_login(self.staff)
        response = self.client.get(reverse("gestione_documenti"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Certificato ISO")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class NuovoDocumentoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdoc2", email="staffdoc2@example.com", password="testpass123", is_staff=True
        )
        self.utente = User.objects.create_user(
            username="normaledoc2", email="normaledoc2@example.com", password="testpass123"
        )
        self.categoria = _crea_categoria_file()

    def test_post_valido_crea_documento_e_risponde_con_tabella_aggiornata(self):
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        response = self.client.post(
            reverse("nuovo_documento"),
            data={"nome_file": "Certificato ISO", "categoria": self.categoria.pk, "file": file},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Certificato ISO")
        self.assertTrue(File.objects.filter(nome_file="Certificato ISO").exists())

    def test_post_con_categoria_nuova_la_crea_e_associa(self):
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        response = self.client.post(
            reverse("nuovo_documento"),
            data={"nome_file": "Normativa X", "categoria": "", "categoria_nuova": "Normative", "file": file},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        documento = File.objects.get(nome_file="Normativa X")
        self.assertEqual(documento.categoria.nome_categoria, "Normative")

    def test_post_non_valido_non_crea_nulla_e_risponde_con_form_errori(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("nuovo_documento"),
            data={"nome_file": "Documento senza file", "categoria": self.categoria.pk},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(File.objects.filter(nome_file="Documento senza file").exists())

    def test_utente_normale_non_autorizzato(self):
        self.client.force_login(self.utente)
        response = self.client.post(reverse("nuovo_documento"), data={}, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 302)

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("nuovo_documento"))
        self.assertEqual(response.status_code, 405)

    def test_post_non_ajax_valido_reindirizza_a_gestione_documenti(self):
        self.client.force_login(self.staff)
        file = SimpleUploadedFile("doc.pdf", PDF_MINIMO, content_type="application/pdf")
        response = self.client.post(
            reverse("nuovo_documento"),
            data={"nome_file": "Certificato ISO", "categoria": self.categoria.pk, "file": file},
        )
        self.assertRedirects(response, reverse("gestione_documenti"))
        self.assertTrue(File.objects.filter(nome_file="Certificato ISO").exists())


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ModificaDocumentoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdoc3", email="staffdoc3@example.com", password="testpass123", is_staff=True
        )
        self.categoria = _crea_categoria_file()
        self.documento = _crea_documento(nome_file="Certificato ISO", categoria=self.categoria)

    def test_post_valido_aggiorna_documento_esistente(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_documento", args=[self.documento.pk]),
            data={"nome_file": "Certificato ISO aggiornato", "categoria": self.categoria.pk},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 200)
        self.documento.refresh_from_db()
        self.assertEqual(self.documento.nome_file, "Certificato ISO aggiornato")

    def test_post_non_valido_non_modifica_nulla(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_documento", args=[self.documento.pk]),
            data={"nome_file": "", "categoria": self.categoria.pk},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 400)
        self.documento.refresh_from_db()
        self.assertEqual(self.documento.nome_file, "Certificato ISO")

    def test_utente_normale_non_autorizzato(self):
        User = get_user_model()
        utente = User.objects.create_user(username="normaledoc3", email="normaledoc3@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.post(
            reverse("modifica_documento", args=[self.documento.pk]), data={}, HTTP_X_REQUESTED_WITH="XMLHttpRequest"
        )
        self.assertEqual(response.status_code, 302)

    def test_pk_inesistente_risponde_404(self):
        self.client.force_login(self.staff)
        response = self.client.post(
            reverse("modifica_documento", args=[999999]),
            data={"nome_file": "x", "categoria": self.categoria.pk},
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(response.status_code, 404)

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("modifica_documento", args=[self.documento.pk]))
        self.assertEqual(response.status_code, 405)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class EliminaDocumentoViewTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdoc4", email="staffdoc4@example.com", password="testpass123", is_staff=True
        )
        self.categoria = _crea_categoria_file()
        self.documento = _crea_documento(nome_file="Certificato ISO", categoria=self.categoria)

    def test_post_elimina_documento_e_cancella_il_file_fisico(self):
        self.client.force_login(self.staff)
        percorso_file = self.documento.file.path
        self.assertTrue(os.path.exists(percorso_file))
        response = self.client.post(reverse("elimina_documento", args=[self.documento.pk]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(File.objects.filter(pk=self.documento.pk).exists())
        self.assertFalse(os.path.exists(percorso_file))

    def test_utente_normale_non_autorizzato(self):
        User = get_user_model()
        utente = User.objects.create_user(username="normaledoc4", email="normaledoc4@example.com", password="testpass123")
        self.client.force_login(utente)
        response = self.client.post(reverse("elimina_documento", args=[self.documento.pk]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(File.objects.filter(pk=self.documento.pk).exists())

    def test_pk_inesistente_risponde_404(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("elimina_documento", args=[999999]), HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.status_code, 404)

    def test_get_risponde_405(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("elimina_documento", args=[self.documento.pk]))
        self.assertEqual(response.status_code, 405)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class GestioneDocumentiContrattoJsTest(TestCase):
    # Guardia di regressione per il contratto tra il template e
    # gestione-documenti.js: stesso spirito di
    # AvvisoChiusuraGestionePageContrattoJsTest in Avvisi/tests.py
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(
            username="staffdoccontratto", email="staffdoccontratto@example.com", password="testpass123", is_staff=True
        )
        _crea_documento(nome_file="Certificato ISO")

    def test_pagina_contiene_id_ed_attributi_richiesti_dal_js(self):
        self.client.force_login(self.staff)
        response = self.client.get(reverse("gestione_documenti"))
        self.assertEqual(response.status_code, 200)
        stringhe_richieste = [
            'id="tabella-documenti"',
            'id="modalDocumento"',
            'id="modalDocumentoBody"',
            'id="btnNuovoDocumento"',
            'id="form-documento"',
            'data-nome-file="',
            'data-categoria-pk="',
            'data-url-modifica="',
            'data-url-elimina="',
            'btn-modifica-documento',
            'btn-elimina-documento',
        ]
        for stringa in stringhe_richieste:
            self.assertContains(response, stringa)
