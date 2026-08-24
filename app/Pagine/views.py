import os
from functools import wraps
from typing import Any

from django import forms
from django.conf import settings
from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST
from django.views.generic import ListView

from Prodotti.models import DEFAULT_IMMAGINE_ARTICOLO, ImmaginiArticolo, Prodotto
from .forms import DocumentoForm
from .models import File, CategoriaFile

# Create your views here.

class DocumentoView(ListView):
    model = CategoriaFile
    template_name='documenti.html'


    def get_context_data(self):
        context = super().get_context_data()
        context['files'] = File.objects.all()
        return context


def dashboard_richiesto(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        if not request.user.is_staff:
            return redirect('home')
        return view_func(request, *args, **kwargs)
    return wrapper


@dashboard_richiesto
def dashboard_admin(request):
    return render(request, 'dashboard_admin.html')


@dashboard_richiesto
def dashboard_prodotti_senza_immagine(request):
    prodotti = Prodotto.objects.select_related('categoria', 'sottocategoria').filter(
        Q(immagine_rel__isnull=True)
        | Q(immagine_rel__immagine=DEFAULT_IMMAGINE_ARTICOLO)
        | Q(immagine_rel__immagine='')
        | Q(immagine_rel__immagine__isnull=True)
    ).exclude(
        Q(categoria__nome_categoria__iexact="prodotti chimici")
        & (Q(gruppo=0) | Q(gruppo__isnull=True))
    ).order_by('codice_prodotto')
    return render(request, 'dashboard_prodotti_senza_immagine.html', {
        'prodotti': prodotti,
        'default_immagine_articolo': DEFAULT_IMMAGINE_ARTICOLO,
    })


@dashboard_richiesto
@require_POST
def carica_immagine_prodotto(request, pk):
    prodotto = get_object_or_404(Prodotto, pk=pk)
    file = request.FILES.get('immagine')
    try:
        file = forms.ImageField().clean(file)
    except ValidationError as errore:
        return JsonResponse({'ok': False, 'error': errore.messages[0]}, status=400)

    # L'estensione va derivata dal formato immagine effettivamente
    # validato da Pillow (file.image.format, popolato da
    # forms.ImageField().clean() sopra), non dal nome file fornito dal
    # client: altrimenti un file rinominato x.html contenente byte GIF
    # validi verrebbe salvato e servito come .html dalla stessa origine.
    ESTENSIONE_PER_FORMATO = {
        'JPEG': '.jpg',
        'PNG': '.png',
        'GIF': '.gif',
        'WEBP': '.webp',
    }
    estensione = ESTENSIONE_PER_FORMATO.get(file.image.format)
    if estensione is None:
        return JsonResponse({'ok': False, 'error': 'Formato immagine non supportato.'}, status=400)
    file.name = f"{prodotto.codice_prodotto}{estensione}"

    immagine_articolo, _ = ImmaginiArticolo.objects.get_or_create(articolo=prodotto)

    # Se un file esiste già esattamente al percorso di destinazione (es. un
    # caricamento precedente per lo stesso prodotto nello stesso formato),
    # va rimosso prima del salvataggio: altrimenti lo storage aggiungerebbe
    # un suffisso casuale al nome per evitare la collisione, rompendo
    # silenziosamente il matching per nome file usato dallo script di
    # sincronizzazione bulk (configuraImmagini in Prodotti/views.py).
    campo_immagine = immagine_articolo._meta.get_field('immagine')
    percorso_destinazione = campo_immagine.generate_filename(immagine_articolo, file.name)
    if campo_immagine.storage.exists(percorso_destinazione):
        campo_immagine.storage.delete(percorso_destinazione)

    # Un caricamento precedente in un FORMATO diverso (es. prima .jpg, ora
    # .png) lascerebbe altrimenti quel vecchio file orfano su disco - il
    # controllo sopra non lo trova perche' cerca solo al nuovo percorso di
    # destinazione. configuraImmagini() (Prodotti/views.py) fa match per
    # solo prefisso "codice_prodotto" su tutti i file della cartella: se il
    # vecchio file resta, la sincronizzazione bulk puo' ripuntare
    # l'immagine del prodotto su di lui in base all'ordine (non garantito)
    # restituito da os.listdir().
    cartella_immagini = os.path.dirname(percorso_destinazione)
    nome_nuovo_file = os.path.basename(percorso_destinazione)
    # La cartella potrebbe non esistere ancora (primo upload in assoluto in
    # questo MEDIA_ROOT, es. nei test): "storage.exists" funziona anche per
    # le directory, non solo per i file
    if not campo_immagine.storage.exists(cartella_immagini):
        nomi_file_esistenti = []
    else:
        _, nomi_file_esistenti = campo_immagine.storage.listdir(cartella_immagini)
    for nome_file in nomi_file_esistenti:
        if nome_file == nome_nuovo_file:
            continue
        if os.path.splitext(nome_file)[0] == prodotto.codice_prodotto:
            campo_immagine.storage.delete(os.path.join(cartella_immagini, nome_file))

    immagine_articolo.immagine = file
    immagine_articolo.save()

    # I template che mostrano l'immagine prodotto (griglia_prodotti.html,
    # carrello.html, dettaglio_preventivo.html) stampano il valore del
    # campo direttamente, senza `.url` - funziona solo perche' le righe
    # create dallo script di sincronizzazione bulk (configuraImmagini in
    # Prodotti/views.py) vi scrivono un path assoluto letterale invece del
    # nome relativo standard di Django. Il nome salvato va riscritto nello
    # stesso formato per restare compatibile.
    # Nota: settings.MEDIA_URL in settings.py e' 'media/' (senza slash
    # iniziale), ma Django antepone automaticamente lo script prefix
    # quando lo si legge tramite l'oggetto settings (vedi
    # LazySettings._add_script_prefix), quindi a runtime vale gia'
    # '/media/'. lstrip('/') garantisce un solo slash iniziale in
    # entrambi i casi, evitando un doppio slash.
    immagine_articolo.immagine.name = f"/{settings.MEDIA_URL.lstrip('/')}{immagine_articolo.immagine.name}"
    immagine_articolo.save(update_fields=['immagine'])
    return JsonResponse({'ok': True})


def _is_ajax_request_documenti(request):
    # Stesso pattern gia' usato in Avvisi/views.py e Prodotti/views.py:
    # l'header lo manda il fetch() del JS (vedi
    # app/static/js/gestione-documenti.js), mai un browser in una
    # richiesta di navigazione normale
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _categorie_con_conteggio():
    # "num_documenti": usato sia dalla colonna sinistra (badge con il
    # conteggio accanto a ogni categoria) sia, indirettamente, come elenco
    # aggiornato di categorie per lo snapshot del form vuoto - vedi
    # commento su "opzioniCategoriaAggiornate" in tabella_documenti.html
    return CategoriaFile.objects.annotate(num_documenti=Count('file_cat')).order_by('nome_categoria')


def _risposta_tabella_documenti(request):
    if not _is_ajax_request_documenti(request):
        # Nessun JS e form comunque sottomesso come navigazione vera: un
        # frammento nudo sarebbe una pagina rotta, si torna alla pagina
        # completa (POST-redirect-GET)
        return redirect('gestione_documenti')
    documenti = File.objects.select_related('categoria').order_by('nome_file')
    return render(request, 'partials/tabella_documenti.html', {
        'documenti': documenti,
        'categorie': _categorie_con_conteggio(),
    })


def _risposta_form_documento_errori(request, form, azione_url):
    if not _is_ajax_request_documenti(request):
        return redirect('gestione_documenti')
    return render(request, 'partials/form_documento.html', {
        'form': form,
        'azione_url': azione_url,
    }, status=400)


@dashboard_richiesto
def gestione_documenti(request):
    documenti = File.objects.select_related('categoria').order_by('nome_file')
    form = DocumentoForm()
    return render(request, 'gestione_documenti.html', {
        'documenti': documenti,
        'form': form,
        'azione_url': reverse('nuovo_documento'),
        'categorie': _categorie_con_conteggio(),
    })


@dashboard_richiesto
@require_POST
def nuovo_documento(request):
    form = DocumentoForm(request.POST, request.FILES)
    if form.is_valid():
        form.save()
        return _risposta_tabella_documenti(request)
    return _risposta_form_documento_errori(request, form, reverse('nuovo_documento'))


@dashboard_richiesto
@require_POST
def modifica_documento(request, pk):
    documento = get_object_or_404(File, pk=pk)
    form = DocumentoForm(request.POST, request.FILES, instance=documento)
    if form.is_valid():
        form.save()
        return _risposta_tabella_documenti(request)
    return _risposta_form_documento_errori(request, form, reverse('modifica_documento', args=[pk]))


@dashboard_richiesto
@require_POST
def elimina_documento(request, pk):
    documento = get_object_or_404(File, pk=pk)
    if documento.file:
        # Django non cancella il file fisico dallo storage quando si
        # elimina la riga: va fatto esplicitamente, altrimenti resta
        # orfano su disco
        documento.file.delete(save=False)
    documento.delete()
    return _risposta_tabella_documenti(request)


@dashboard_richiesto
@require_POST
def rinomina_categoria(request, pk):
    categoria = get_object_or_404(CategoriaFile, pk=pk)
    nuovo_nome = request.POST.get('nome_categoria', '').strip()
    if not nuovo_nome:
        if not _is_ajax_request_documenti(request):
            return redirect('gestione_documenti')
        return JsonResponse({'errore': "Il nome della categoria non puo' essere vuoto."}, status=400)
    if CategoriaFile.objects.filter(nome_categoria__iexact=nuovo_nome).exclude(pk=categoria.pk).exists():
        if not _is_ajax_request_documenti(request):
            return redirect('gestione_documenti')
        return JsonResponse({'errore': "Esiste gia' una categoria con questo nome."}, status=400)
    categoria.nome_categoria = nuovo_nome
    categoria.save()
    return _risposta_tabella_documenti(request)


@dashboard_richiesto
@require_POST
def elimina_categoria(request, pk):
    categoria = get_object_or_404(CategoriaFile, pk=pk)
    # Elimina anche i documenti della categoria (non solo la riga: come in
    # elimina_documento, il file fisico va cancellato esplicitamente,
    # altrimenti resta orfano su disco - la CASCADE del ForeignKey
    # cancellerebbe solo le righe File, non i file su storage)
    for documento in categoria.file_cat.all():
        if documento.file:
            documento.file.delete(save=False)
        documento.delete()
    categoria.delete()
    return _risposta_tabella_documenti(request)
