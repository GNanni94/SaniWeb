from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from .forms import AvvisoChiusuraForm
from .models import AvvisoChiusura

staff_richiesto = user_passes_test(lambda u: u.is_authenticated and u.is_staff, login_url='login')


def _is_ajax_request(request):
    # Stesso pattern gia' usato in Prodotti/views.py: l'header lo manda il
    # fetch() del JS (vedi app/static/js/gestione-avvisi.js), mai un
    # browser in una richiesta di navigazione normale
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _risposta_tabella(request):
    if not _is_ajax_request(request):
        # Nessun JS (es. collectstatic saltato in deploy) e form comunque
        # sottomesso come navigazione vera: un frammento nudo sarebbe una
        # pagina rotta, si torna alla pagina completa (POST-redirect-GET)
        return redirect('gestione_avvisi')
    avvisi = AvvisoChiusura.objects.all()
    return render(request, 'partials/tabella_avvisi.html', {'avvisi': avvisi})


def _risposta_form_errori(request, form, azione_url):
    if not _is_ajax_request(request):
        # Senza JS non c'e' modo di mostrare gli errori inline: si
        # degrada tornando alla pagina completa, perdendo i valori appena
        # inseriti (non esiste un flusso form a pagina intera per questa
        # funzionalita')
        return redirect('gestione_avvisi')
    return render(request, 'partials/form_avviso.html', {
        'form': form,
        'azione_url': azione_url,
    }, status=400)


@staff_richiesto
def gestione_avvisi(request):
    avvisi = AvvisoChiusura.objects.all()
    form = AvvisoChiusuraForm()
    return render(request, 'gestione_avvisi.html', {
        'avvisi': avvisi,
        'form': form,
        'azione_url': reverse('nuovo_avviso'),
    })


@staff_richiesto
@require_POST
def nuovo_avviso(request):
    form = AvvisoChiusuraForm(request.POST)
    if form.is_valid():
        form.save()
        return _risposta_tabella(request)
    return _risposta_form_errori(request, form, reverse('nuovo_avviso'))


@staff_richiesto
@require_POST
def modifica_avviso(request, pk):
    avviso = get_object_or_404(AvvisoChiusura, pk=pk)
    form = AvvisoChiusuraForm(request.POST, instance=avviso)
    if form.is_valid():
        form.save()
        return _risposta_tabella(request)
    return _risposta_form_errori(request, form, reverse('modifica_avviso', args=[pk]))


@staff_richiesto
@require_POST
def elimina_avviso(request, pk):
    avviso = get_object_or_404(AvvisoChiusura, pk=pk)
    avviso.delete()
    return _risposta_tabella(request)
