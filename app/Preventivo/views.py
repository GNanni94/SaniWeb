from django.db.models.query import QuerySet
from django.shortcuts import redirect, get_object_or_404
from Carrello.models import Carrello
from Prodotti.models import puo_vedere_precursori
from .models import Preventivo, Elementi_Preventivo
from .forms import DettaglioPreventivoForm
from django.views.decorators.http import require_POST
from django.views.generic import ListView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import redirect_to_login
from django.contrib import messages
from typing import Any, Dict
from InvioEmail.views import emailPreventivo
import logging

# Create your views here.


class PreventivoListView(LoginRequiredMixin, ListView):
    model = Preventivo
    template_name = "preventivo.html"
    paginate_by = 8

    def get_queryset(self) -> QuerySet[Any]:
        return self.request.user.ordini.all()

    def paginate_queryset(self, queryset, page_size):
        paginator = self.get_paginator(
            queryset, page_size, orphans=self.get_paginate_orphans(),
            allow_empty_first_page=self.get_allow_empty(),
        )
        page = self.request.GET.get(self.page_kwarg) or 1
        page_obj = paginator.get_page(page)
        return (paginator, page_obj, page_obj.object_list, page_obj.has_other_pages())

@require_POST
def crea_ordine_da_carrello(request):
    if request.user.is_authenticated:
        carrello = Carrello.objects.filter(cliente = request.user).select_related('prodotto')
        if not carrello.exists():
            messages.error(request, 'Il carrello è vuoto.')
            return redirect('carrello')

        dettaglio_form = DettaglioPreventivoForm(request.POST)
        if not dettaglio_form.is_valid():
            messages.error(request, 'Dati non validi, riprova.')
            return redirect('carrello')

        carrello_items = list(carrello)
        # Esclude i prodotti con precursore non consentito al cliente
        elementi_inclusi = [
            elemento_carrello for elemento_carrello in carrello_items
            if not (elemento_carrello.prodotto.precursore and not puo_vedere_precursori(request.user))
        ]
        if not elementi_inclusi:
            messages.error(request, 'Tutti i prodotti nel carrello sono riservati ai clienti azienda: richiesta non inviata.', extra_tags='precursore-riservato')
            return redirect('carrello')

        preventivo = Preventivo()
        preventivo.cliente = request.user
        preventivo.save()

        dettaglio_preventivo = dettaglio_form.save(commit=False)
        dettaglio_preventivo.preventivo = preventivo
        dettaglio_preventivo.save()
        dettaglio_form.save_m2m()

        for elemento_carrello in elementi_inclusi:
            elemento_ordine = Elementi_Preventivo.objects.create(preventivo = preventivo, prodotto = elemento_carrello.prodotto, quantita = elemento_carrello.quantita)
            elemento_ordine.save()
        if len(elementi_inclusi) < len(carrello_items):
            messages.warning(request, 'Uno o piu\' prodotti riservati ai clienti azienda non sono stati inclusi nella richiesta.', extra_tags='precursore-riservato')
        try:
            emailPreventivo(request, elementi_inclusi, dettaglio_preventivo, preventivo)
        except Exception:
            logging.getLogger(__name__).exception(f"Invio email preventivo fallito per il preventivo {preventivo.pk}")
            dettaglio_preventivo.stato = "errore"
            dettaglio_preventivo.save()
        carrello.delete()

        return redirect('lista_ordini')
    return redirect_to_login(request.get_full_path())

def aggiungi_preventivo_al_carrello(request, pk):
    if request.user.is_authenticated:
        preventivo = get_object_or_404(Preventivo, pk=pk, cliente=request.user)
        almeno_un_elemento_saltato = False
        for elemento_preventivo in preventivo.elementi_preventivo.select_related('prodotto'):
            # Esclude i prodotti con precursore non consentito al cliente
            if elemento_preventivo.prodotto.precursore and not puo_vedere_precursori(request.user):
                almeno_un_elemento_saltato = True
                continue
            elemento_carrello, created = Carrello.objects.get_or_create(cliente=request.user, prodotto=elemento_preventivo.prodotto)
            elemento_carrello.quantita += elemento_preventivo.quantita
            elemento_carrello.save()
        if almeno_un_elemento_saltato:
            messages.warning(request, 'Uno o piu\' prodotti riservati ai clienti azienda non sono stati aggiunti al carrello.', extra_tags='precursore-riservato')
        # Salva messaggio e luogo in sessione per precompilare il form del carrello
        dettaglio_preventivo = preventivo.dettaglio_preventivo
        request.session['messaggio_precompilato'] = dettaglio_preventivo.messaggio
        request.session['luogo_precompilato'] = dettaglio_preventivo.luogo
        return redirect('carrello')
    return redirect_to_login(request.get_full_path())

class PreventivoDetailView(LoginRequiredMixin, ListView):
    model = Preventivo
    template_name = "dettaglio_preventivo.html"

    def get_queryset(self) -> QuerySet[Any]:
        # Un utente puo' vedere solo il dettaglio dei propri preventivi, non
        # quelli di altri clienti: prima non c'era alcun filtro sul
        # proprietario, bastava cambiare il pk nell'URL per vedere prodotti,
        # quantita' e dati di un preventivo altrui
        self.preventivo = get_object_or_404(Preventivo, pk=self.kwargs['pk'], cliente=self.request.user)
        object_list = self.preventivo.elementi_preventivo.select_related('prodotto', 'prodotto__immagine_rel')
        return object_list

    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["totale_elementi_ordine"] = sum(elemento.quantita for elemento in self.object_list)
        context["preventivo"] = self.preventivo
        context["dettaglio_preventivo"] = self.preventivo.dettaglio_preventivo
        return context
        
