from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from .forms import AvvisoChiusuraForm
from .models import AvvisoChiusura

staff_richiesto = user_passes_test(lambda u: u.is_authenticated and u.is_staff, login_url='login')


def _risposta_tabella(request):
    avvisi = AvvisoChiusura.objects.all()
    return render(request, 'partials/tabella_avvisi.html', {'avvisi': avvisi})


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
    return render(request, 'partials/form_avviso.html', {
        'form': form,
        'azione_url': reverse('nuovo_avviso'),
    }, status=400)


@staff_richiesto
@require_POST
def modifica_avviso(request, pk):
    avviso = get_object_or_404(AvvisoChiusura, pk=pk)
    form = AvvisoChiusuraForm(request.POST, instance=avviso)
    if form.is_valid():
        form.save()
        return _risposta_tabella(request)
    return render(request, 'partials/form_avviso.html', {
        'form': form,
        'azione_url': reverse('modifica_avviso', args=[pk]),
    }, status=400)


@staff_richiesto
@require_POST
def elimina_avviso(request, pk):
    avviso = get_object_or_404(AvvisoChiusura, pk=pk)
    avviso.delete()
    return _risposta_tabella(request)
