from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods, require_POST

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
    response = render(request, 'partials/form_avviso.html', {
        'form': form,
        'azione_url': azione_url,
    }, status=400)
    # Il form (partials/form_avviso.html) ha "hx-target=#tabella-avvisi"
    # perche' e' l'unico bersaglio corretto per una risposta di SUCCESSO
    # (200): questi due header dicono a htmx di ignorarlo SOLO per questa
    # risposta e mandare invece il frammento (il form stesso, con gli
    # errori) dentro il modal - meccanismo nativo di htmx (vedi
    # gestione-avvisi.js), non serve nessuna logica JS per riconoscere il
    # caso ne' per Avvisi ne' per Pagine (stesso pattern, elenco
    # helper non condivisi in CLAUDE.md)
    response['HX-Retarget'] = '#modalAvvisoBody'
    response['HX-Reswap'] = 'innerHTML'
    return response


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
@require_http_methods(["GET", "POST"])
def modifica_avviso(request, pk):
    avviso = get_object_or_404(AvvisoChiusura, pk=pk)
    if request.method == "POST":
        form = AvvisoChiusuraForm(request.POST, instance=avviso)
        if form.is_valid():
            form.save()
            return _risposta_tabella(request)
        return _risposta_form_errori(request, form, reverse('modifica_avviso', args=[pk]))
    # GET: apre il pop-up "Modifica" gia' precompilato con i dati esistenti -
    # stesso frammento usato per il salvataggio (partials/form_avviso.html),
    # qui pero' costruito da un form non sottomesso (instance=avviso, nessun
    # data=...) cosi' i campi mostrano i valori attuali invece di restare
    # vuoti. Il bottone "Modifica" (partials/tabella_avvisi.html) lo chiama
    # con hx-get, non serve piu' JS che legga i dati dalla riga e li scriva
    # a mano nei campi del form
    if not _is_ajax_request(request):
        return redirect('gestione_avvisi')
    form = AvvisoChiusuraForm(instance=avviso)
    return render(request, 'partials/form_avviso.html', {
        'form': form,
        'azione_url': reverse('modifica_avviso', args=[pk]),
    })


@staff_richiesto
@require_POST
def elimina_avviso(request, pk):
    avviso = get_object_or_404(AvvisoChiusura, pk=pk)
    avviso.delete()
    return _risposta_tabella(request)


@staff_richiesto
@require_POST
def toggle_avviso(request, pk):
    avviso = get_object_or_404(AvvisoChiusura, pk=pk)
    avviso.attivo = not avviso.attivo
    # "update_fields": scrive sul database solo questo campo, cosi' un
    # salvataggio concorrente su un altro campo dello stesso avviso (es. dal
    # pop-up Modifica) non viene sovrascritto per sbaglio da qui
    avviso.save(update_fields=["attivo"])
    return _risposta_tabella(request)
