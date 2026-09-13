from functools import wraps
from typing import Any

from django import forms
from django.conf import settings
from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import ValidationError
from django.db.models import Prefetch, Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.urls import reverse
from django.views.decorators.http import require_http_methods, require_POST
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
    # Categorie distinte tra i prodotti filtrati, ordinate per nome
    categorie_presenti = sorted(
        {prodotto.categoria for prodotto in prodotti if prodotto.categoria_id},
        key=lambda categoria: categoria.nome_categoria.lower()
    )
    return render(request, 'dashboard_prodotti_senza_immagine.html', {
        'prodotti': prodotti,
        'categorie_presenti': categorie_presenti,
        'default_immagine_articolo': DEFAULT_IMMAGINE_ARTICOLO,
    })


# Estensione del file salvato per ciascun formato immagine rilevato da Pillow.
ESTENSIONE_PER_FORMATO = {
    'JPEG': '.jpg',
    'PNG': '.png',
    'GIF': '.gif',
    'WEBP': '.webp',
}


@dashboard_richiesto
@require_POST
def carica_immagine_prodotto(request, pk):
    prodotto = get_object_or_404(Prodotto, pk=pk)
    file = request.FILES.get('immagine')
    try:
        file = forms.ImageField().clean(file)
    except ValidationError as errore:
        return JsonResponse({'ok': False, 'error': errore.messages[0]}, status=400)

    estensione = ESTENSIONE_PER_FORMATO.get(file.image.format)
    if estensione is None:
        return JsonResponse({'ok': False, 'error': 'Formato immagine non supportato.'}, status=400)
    file.name = f"{prodotto.codice_prodotto}{estensione}"

    immagine_articolo, _ = ImmaginiArticolo.objects.get_or_create(articolo=prodotto)

    campo_immagine = immagine_articolo._meta.get_field('immagine')
    vecchio_nome = immagine_articolo.immagine.name
    if vecchio_nome and vecchio_nome != DEFAULT_IMMAGINE_ARTICOLO:
        vecchio_percorso = vecchio_nome.removeprefix(f"/{settings.MEDIA_URL.lstrip('/')}")
        if campo_immagine.storage.exists(vecchio_percorso):
            campo_immagine.storage.delete(vecchio_percorso)

    percorso_destinazione = campo_immagine.generate_filename(immagine_articolo, file.name)
    if campo_immagine.storage.exists(percorso_destinazione):
        campo_immagine.storage.delete(percorso_destinazione)

    immagine_articolo.immagine = file
    immagine_articolo.save()
    immagine_articolo.immagine.name = f"/{settings.MEDIA_URL.lstrip('/')}{immagine_articolo.immagine.name}"
    immagine_articolo.save(update_fields=['immagine'])

    return JsonResponse({'ok': True})


def _is_ajax_request_documenti(request):
    # Stesso pattern gia' usato in Avvisi/views.py e Prodotti/views.py:
    # l'header lo manda il fetch() del JS (vedi
    # app/static/js/gestione-documenti.js), mai un browser in una
    # richiesta di navigazione normale
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _categorie_documenti():
    # "Prefetch" coi documenti gia' ordinati per nome: partials/tabella_documenti.html
    # itera "categoria.file_cat.all" per popolare ogni riga, senza una query
    # aggiuntiva per categoria (altrimenti N+1, una query per ogni categoria
    # nel ciclo del template)
    return CategoriaFile.objects.prefetch_related(
        Prefetch('file_cat', queryset=File.objects.order_by('nome_file'))
    ).order_by('nome_categoria')


def _risposta_tabella_documenti(request):
    if not _is_ajax_request_documenti(request):
        # Nessun JS e form comunque sottomesso come navigazione vera: un
        # frammento nudo sarebbe una pagina rotta, si torna alla pagina
        # completa (POST-redirect-GET)
        return redirect('gestione_documenti')
    contesto = {
        'categorie': _categorie_documenti(),
        'documenti_totali': File.objects.exists(),
    }
    # "partials/tabella_documenti.html" ha "#tabella-documenti" come unica
    # radice: e' l'unico frammento compatibile con "hx-swap=morph:outerHTML"
    # sul bersaglio omonimo. Il menu "Filtra per sezione" nell'intestazione
    # e' un elemento fratello fuori da quel bersaglio, quindi va aggiornato
    # "out-of-band" (stesso pattern del banner in Avvisi/views.py)
    html_tabella = render_to_string(request=request, template_name='partials/tabella_documenti.html', context=contesto)
    html_menu_filtro = render_to_string(request=request, template_name='partials/menu_filtro_sezione_documenti.html', context={**contesto, 'oob': True})
    return HttpResponse(html_tabella + html_menu_filtro)


def _risposta_form_documento_errori(request, form, azione_url):
    if not _is_ajax_request_documenti(request):
        return redirect('gestione_documenti')
    response = render(request, 'partials/form_documento.html', {
        'form': form,
        'azione_url': azione_url,
    }, status=400)
    # Il form (partials/form_documento.html) ha "hx-target=#tabella-documenti"
    # perche' e' l'unico bersaglio corretto per una risposta di SUCCESSO
    # (200): questi due header dicono a htmx di ignorarlo SOLO per questa
    # risposta e mandare invece il frammento (il form stesso, con gli
    # errori) dentro il modal - stesso meccanismo di Avvisi/views.py
    response['HX-Retarget'] = '#modalDocumentoBody'
    response['HX-Reswap'] = 'innerHTML'
    return response


@dashboard_richiesto
def gestione_documenti(request):
    form = DocumentoForm()
    return render(request, 'gestione_documenti.html', {
        'form': form,
        'azione_url': reverse('nuovo_documento'),
        'categorie': _categorie_documenti(),
        'documenti_totali': File.objects.exists(),
    })


@dashboard_richiesto
@require_http_methods(["GET", "POST"])
def nuovo_documento(request):
    if request.method == "POST":
        form = DocumentoForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return _risposta_tabella_documenti(request)
        return _risposta_form_documento_errori(request, form, reverse('nuovo_documento'))
    # GET: apre il pop-up "+ Nuovo documento" con un form vuoto, stesso
    # frammento usato dal salvataggio (partials/form_documento.html)
    if not _is_ajax_request_documenti(request):
        return redirect('gestione_documenti')
    form = DocumentoForm()
    return render(request, 'partials/form_documento.html', {
        'form': form,
        'azione_url': reverse('nuovo_documento'),
    })


@dashboard_richiesto
@require_http_methods(["GET", "POST"])
def modifica_documento(request, pk):
    documento = get_object_or_404(File, pk=pk)
    if request.method == "POST":
        form = DocumentoForm(request.POST, request.FILES, instance=documento)
        if form.is_valid():
            form.save()
            return _risposta_tabella_documenti(request)
        return _risposta_form_documento_errori(request, form, reverse('modifica_documento', args=[pk]))
    # GET: apre il pop-up "Modifica" gia' precompilato coi dati esistenti,
    # stesso frammento usato per il salvataggio (partials/form_documento.html)
    if not _is_ajax_request_documenti(request):
        return redirect('gestione_documenti')
    form = DocumentoForm(instance=documento)
    return render(request, 'partials/form_documento.html', {
        'form': form,
        'azione_url': reverse('modifica_documento', args=[pk]),
        'documento': documento,
    })


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
