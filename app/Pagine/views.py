from functools import wraps
from typing import Any

from django import forms
from django.conf import settings
from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST
from django.views.generic import ListView

from Prodotti.models import DEFAULT_IMMAGINE_ARTICOLO, ImmaginiArticolo, Prodotto
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
    ).order_by('codice_prodotto')
    return render(request, 'dashboard_prodotti_senza_immagine.html', {'prodotti': prodotti})


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
    # caricamento precedente per lo stesso prodotto), va rimosso prima del
    # salvataggio: altrimenti lo storage aggiungerebbe un suffisso casuale
    # al nome per evitare la collisione, rompendo silenziosamente il
    # matching per nome file usato dallo script di sincronizzazione
    # bulk (configuraImmagini in Prodotti/views.py).
    campo_immagine = immagine_articolo._meta.get_field('immagine')
    percorso_destinazione = campo_immagine.generate_filename(immagine_articolo, file.name)
    if campo_immagine.storage.exists(percorso_destinazione):
        campo_immagine.storage.delete(percorso_destinazione)

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
