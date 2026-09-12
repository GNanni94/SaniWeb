from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import redirect_to_login
from django.views.decorators.http import require_POST
from .models import Carrello
from Prodotti.models import Prodotto, puo_vedere_precursori
from django.contrib import messages
from django.utils.http import url_has_allowed_host_and_scheme
from typing import Any, Dict
from Preventivo.forms import DettaglioPreventivoForm
from Preventivo.models import Preventivo
from .forms import CarrelloForm
import logging

logger = logging.getLogger(__name__)

def _is_richiesta_ajax(request):
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _is_richiesta_pagina_carrello(request):
    # Distingue se l'azione arriva dalla pagina carrello o dal widget flottante
    return request.POST.get('contesto') == 'pagina_carrello'


def _render_widget_carrello_flottante(request):
    # elementi_carrello_utente/totale_elementi_carrello arrivano dal context processor globale
    return render(request, 'partials/carrello_flottante.html')


def _render_lista_carrello(request):
    # elementi_carrello_utente/totale_elementi_carrello arrivano dal context processor globale
    return render(request, 'partials/lista_carrello.html')


def _dispatcher_carrello(request):
    # Sceglie il frammento da restituire in base all'origine della richiesta
    if _is_richiesta_pagina_carrello(request):
        return _render_lista_carrello(request)
    return _render_widget_carrello_flottante(request)


class PaginaCarrelloView(LoginRequiredMixin, TemplateView):

    template_name = "carrello.html"

    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        context = super().get_context_data(**kwargs)
        # elementi_carrello_utente/totale_elementi_carrello arrivano dal context processor globale
        # Precompilazione del form "Richiedi preventivo" da "Riusa preventivo", letta e rimossa dalla sessione
        initial = {}
        if 'messaggio_precompilato' in self.request.session:
            initial['messaggio'] = self.request.session.pop('messaggio_precompilato')
        if 'luogo_precompilato' in self.request.session:
            initial['luogo'] = self.request.session.pop('luogo_precompilato')
        context["preventivo"] = DettaglioPreventivoForm(initial=initial)
        return context

def aggiungi_prodotti_al_carrello(request, prodottoId):
    prodotto = get_object_or_404(Prodotto, pk=prodottoId)
    if request.user.is_authenticated:
        # Ricontrolla il permesso sui prodotti precursore, non solo il filtro del catalogo
        if prodotto.precursore and not puo_vedere_precursori(request.user):
            # Messaggio accodato anche per le richieste AJAX: letto da avviso_precursore.html dopo il reload
            messages.error(request, 'Prodotto riservato alle aziende.', extra_tags='precursore-riservato')
            if _is_richiesta_ajax(request):
                return HttpResponse(status=403)
            referer = request.META.get('HTTP_REFERER')
            if referer and url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
                return redirect(referer)
            return redirect(prodotto)
        logger.info(f"Richiesta aggiunta prodotto {prodottoId} al carrello dell'utente {request.user.pk}")
        elemento_carrello, _ = Carrello.objects.get_or_create(cliente = request.user , prodotto = prodotto)
        elemento_carrello.quantita += 1
        elemento_carrello.save()
        if _is_richiesta_ajax(request):
            return _render_widget_carrello_flottante(request)
        # Torna alla pagina di provenienza con un'ancora sul prodotto aggiunto
        referer = request.META.get('HTTP_REFERER')
        if referer and url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
            return redirect(f"{referer}#prodotto-{prodottoId}")
        return redirect(prodotto)
    # 401 esplicito per le richieste AJAX invece di un redirect al login
    if _is_richiesta_ajax(request):
        return HttpResponse(status=401)
    return redirect_to_login(request.get_full_path())

@require_POST
def elimina_elementi_dal_carrello(request, elemento_carrello_id):
    if request.user.is_authenticated:
        # Filtro di proprieta': elimina solo elementi del carrello dell'utente loggato
        elemento_carrello = Carrello.objects.filter(id = elemento_carrello_id, cliente = request.user).first()
        if elemento_carrello:
            prodotto_id = elemento_carrello.prodotto_id
            elemento_carrello.delete()
            logger.info(f"Eliminato prodotto {prodotto_id} dal carrello dell'utente {request.user.pk}")
        if _is_richiesta_ajax(request):
            return _dispatcher_carrello(request)
        return redirect('carrello')
    # 401 esplicito per le richieste AJAX anonime
    if _is_richiesta_ajax(request):
        return HttpResponse(status=401)
    return redirect('carrello')

@require_POST
def svuota_carrello(request):
    if request.user.is_authenticated:
        # Filtro di proprieta': svuota solo il carrello dell'utente loggato
        Carrello.objects.filter(cliente=request.user).delete()
        logger.info(f"Effettuato svuotamento carrello utente {request.user.pk}")
        if _is_richiesta_ajax(request):
            return _render_widget_carrello_flottante(request)
        return redirect('carrello')
    # Stesso ragionamento di elimina_elementi_dal_carrello
    if _is_richiesta_ajax(request):
        return HttpResponse(status=401)
    return redirect('carrello')

@require_POST
def settaggio_quantita(request, elemento_carrello_id):
    # cliente_id=request.user.pk (non cliente=request.user): funziona anche per un utente anonimo
    elemento_carrello = get_object_or_404(Carrello, pk=elemento_carrello_id, cliente_id=request.user.pk)
    if request.user.is_authenticated:
        carrello_form = CarrelloForm(request.POST)
        # Ignora la richiesta se la quantita' non e' un numero valido
        if carrello_form.is_valid():
            quantita = carrello_form.cleaned_data['quantita']
            logger.info(f"Richiesta settaggio quantita {quantita} prodotto {elemento_carrello.prodotto.pk} carrello {elemento_carrello_id} utente {request.user.pk}")
            if quantita <= 0:
                logger.debug(f"Eliminato il prodotto {elemento_carrello.prodotto.pk} carrello {elemento_carrello_id} utente {request.user.pk} perchè andava sotto l'1")
                elemento_carrello.delete()
            else:
                elemento_carrello.quantita = quantita
                elemento_carrello.save()
            logger.info(f"Effettuato settaggio quantita {quantita} prodotto {elemento_carrello.prodotto.pk} carrello {elemento_carrello_id} utente {request.user.pk}")
        if _is_richiesta_ajax(request):
            return _dispatcher_carrello(request)
        return redirect('carrello')
    if _is_richiesta_ajax(request):
        return HttpResponse(status=401)
    return redirect('carrello')



@require_POST
def aumenta_quantita_carrello(request, elemento_carrello_id):
    # is_authenticated controllato prima della query, per rispondere 401 (non 404) alle richieste AJAX anonime
    if request.user.is_authenticated:
        elemento_carrello = get_object_or_404(Carrello, pk=elemento_carrello_id, cliente=request.user)
        elemento_carrello.quantita += 1
        elemento_carrello.save()
        logger.info(f"Effettuata richiesta aumento quantita prodotto {elemento_carrello.prodotto.pk} carrello {elemento_carrello_id} utente {request.user.pk}")
        if _is_richiesta_ajax(request):
            return _dispatcher_carrello(request)
        return redirect('carrello')
    if _is_richiesta_ajax(request):
        return HttpResponse(status=401)
    return redirect('carrello')


@require_POST
def diminuisci_quantita_carrello(request, elemento_carrello_id):
    if request.user.is_authenticated:
        elemento_carrello = get_object_or_404(Carrello, pk=elemento_carrello_id, cliente=request.user)
        quantita = elemento_carrello.quantita
        logger.info(f"Richiesta diminuzione quantita prodotto {elemento_carrello.prodotto.pk} carrello {elemento_carrello_id} utente {request.user.pk}")
        if quantita == 1:
            logger.debug(f"Eliminato il prodotto {elemento_carrello.prodotto.pk} carrello {elemento_carrello_id} utente {request.user.pk} perchè andava sotto l'1")
            elemento_carrello.delete()
        else:
            elemento_carrello.quantita -= 1
            elemento_carrello.save()
        logger.info(f"Effettuata richiesta diminuzione quantita prodotto {elemento_carrello.prodotto.pk} carrello {elemento_carrello_id} utente {request.user.pk}")
        if _is_richiesta_ajax(request):
            return _dispatcher_carrello(request)
        return redirect('carrello')
    if _is_richiesta_ajax(request):
        return HttpResponse(status=401)
    return redirect('carrello')