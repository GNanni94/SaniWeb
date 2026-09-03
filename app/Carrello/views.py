from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.views.generic import ListView, DetailView  # new
from django.views.generic.edit import UpdateView, DeleteView, CreateView  # new
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import redirect_to_login
from django.views.decorators.http import require_POST
from .models import Carrello
from Prodotti.models import Prodotto, mostra_precursori
from django.contrib import messages
from django.utils.http import url_has_allowed_host_and_scheme
from typing import Any, Dict
from Preventivo.forms import DettaglioPreventivoForm
from Preventivo.models import Preventivo, Dettaglio_Preventivo, Elementi_Preventivo
from .forms import CarrelloForm
import json
import logging

logger = logging.getLogger(__name__)

def _e_richiesta_in_background(request):
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _e_richiesta_da_pagina_carrello(request):
    # Segnale esplicito mandato solo dal JS della pagina carrello
    # (static/js/carrello-ajax.js), aggiunto a mano al FormData: aumenta/
    # diminuisci/elimina sono azioni condivise con il carrello flottante
    # (presente in tutte le altre pagine), quindi una richiesta in background
    # da sola non basta a sapere quale frammento rispondere - un Referer
    # sarebbe implicito e meno affidabile (puo' mancare o essere ridotto dal
    # browser), un campo esplicito nel corpo della richiesta no
    return request.POST.get('contesto') == 'pagina_carrello'


def _render_widget_carrello_flottante(request):
    # Nessun context esplicito da passare: "carrello_ha_prodotti" e' gia'
    # registrato globalmente come context processor (settings.py), quindi
    # render() lo esegue comunque da solo - passarlo qui a mano duplicava
    # la query sugli elementi del carrello ad ogni azione AJAX
    return render(request, 'partials/carrello_flottante.html')


def _contesto_lista_carrello(request):
    elementi_carrello_utente = request.user.elementi_carrello.all()
    return {
        "object_list": elementi_carrello_utente,
        "totale_elementi_carrello": sum(elemento.quantita for elemento in elementi_carrello_utente),
    }


def _render_lista_carrello(request):
    return render(request, 'partials/lista_carrello.html', _contesto_lista_carrello(request))


def _render_frammento_azione_carrello(request):
    # Usata dalle azioni condivise tra pagina carrello e carrello flottante
    # (aumenta/diminuisci/elimina): sceglie quale dei due frammenti
    # restituire in base a "_e_richiesta_da_pagina_carrello" qui sopra
    if _e_richiesta_da_pagina_carrello(request):
        return _render_lista_carrello(request)
    return _render_widget_carrello_flottante(request)


# Create your views here.
class CarrelloListView(LoginRequiredMixin, ListView):

    model = Carrello
    template_name = "carrello.html"

    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context.update(_contesto_lista_carrello(self.request))
        # Precompilazione da un "Riusa preventivo" (vedi
        # Preventivo/views.py:aggiungi_preventivo_al_carrello): valori letti
        # una sola volta e rimossi dalla sessione, cosi' non restano a
        # sporcare visite successive alla pagina del carrello
        initial = {}
        if 'messaggio_precompilato' in self.request.session:
            initial['messaggio'] = self.request.session.pop('messaggio_precompilato')
        if 'luogo_precompilato' in self.request.session:
            initial['luogo'] = self.request.session.pop('luogo_precompilato')
        context["preventivo"] = DettaglioPreventivoForm(initial=initial)
        return context

def elementi_carrello(request):
    elementi_carrello_utente = request.user.elementi_carrello.all()
    context={}
    context['totale_elementi_carrello'] = sum([elemento.quantita for elemento in elementi_carrello_utente])
    return render(request, 'base.html', context)

def aggiungi_prodotti_al_carrello(request, prodottoId):
    prodotto = get_object_or_404(Prodotto, pk=prodottoId)
    if request.user.is_authenticated:
        # Il prodotto puo' essere sparito dal catalogo dell'utente (vedi
        # Prodotti/views.py:_filtra_precursori) tra quando ne ha visto il
        # PK (es. da anonimo, prima del login) e questa richiesta: senza
        # questo controllo l'aggiunta al carrello aggirava comunque il
        # filtro del catalogo
        if prodotto.precursore and not mostra_precursori(request.user):
            if _e_richiesta_in_background(request):
                return HttpResponse(status=403)
            messages.error(request, 'Prodotto riservato ai clienti azienda.', extra_tags='precursore-riservato')
            referer = request.META.get('HTTP_REFERER')
            if referer and url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
                return redirect(referer)
            return redirect(prodotto)
        logger.info(f"Richiesta aggiunta prodotto {prodottoId} al carrello dell'utente {request.user.pk}")
        elemento_carrello, created = Carrello.objects.get_or_create(cliente = request.user , prodotto = prodotto)
        elemento_carrello.quantita += 1
        elemento_carrello.save()
        messages.success(request, 'Carrello aggiornato!')
        if _e_richiesta_in_background(request):
            return _render_widget_carrello_flottante(request)
        # Torna alla pagina di provenienza (stessa pagina di paginazione/
        # ricerca/sottocategoria, con l'ancora sul prodotto appena aggiunto)
        # invece che sempre alla pagina base della categoria: altrimenti si
        # perde la posizione in cui si stava navigando ("sembra riportare su")
        referer = request.META.get('HTTP_REFERER')
        if referer and url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
            return redirect(f"{referer}#prodotto-{prodottoId}")
        return redirect(prodotto)
    # Richiesta in background (vedi "aggiungi-al-carrello.js"): un redirect
    # verrebbe seguito automaticamente da "fetch" fino alla pagina di login,
    # risultando comunque in una risposta 200 (quella pagina) - indistinguibile
    # lato JS da un'aggiunta riuscita. Un 401 esplicito, mai un codice di
    # successo, elimina l'ambiguita' e lascia al JS decidere cosa fare
    # (portare l'utente al login)
    if _e_richiesta_in_background(request):
        return HttpResponse(status=401)
    return redirect_to_login(request.get_full_path())

@require_POST
def elimina_elementi_dal_carrello(request, carrelloId):
    if request.user.is_authenticated:
        logger.info(f"Richiesta eliminazione elemento carrello {carrelloId} utente {request.user.pk}")
        # "cliente=request.user" e' il filtro di proprieta': prima mancava,
        # quindi bastava conoscere/indovinare un carrelloId per cancellare
        # l'elemento di carrello di un altro cliente
        Carrello.objects.filter(id = carrelloId, cliente = request.user).delete()
        logger.info(f"Effettuata richiesta eliminazione elemento carrello {carrelloId} utente {request.user.pk}")
        if _e_richiesta_in_background(request):
            return _render_frammento_azione_carrello(request)
        return redirect('carrello')
    # Utente anonimo (es. sessione scaduta a pagina aperta) + richiesta in
    # background: stesso ragionamento di "aggiungi_prodotti_al_carrello" qui
    # sopra - un 401 esplicito evita che "fetch" scambi per un successo una
    # risposta 200 col widget carrello vuoto (nulla e' stato eliminato)
    if _e_richiesta_in_background(request):
        return HttpResponse(status=401)
    return redirect('carrello')

@require_POST
def svuota_carrello(request):
    if request.user.is_authenticated:
        logger.info(f"Richiesta svuotamento carrello utente {request.user.pk}")
        # "cliente=request.user": stesso filtro di proprieta' gia' usato in
        # elimina_elementi_dal_carrello qui sopra, cosi' la cancellazione
        # riguarda solo gli elementi dell'utente loggato
        Carrello.objects.filter(cliente=request.user).delete()
        logger.info(f"Effettuato svuotamento carrello utente {request.user.pk}")
        if _e_richiesta_in_background(request):
            return _render_widget_carrello_flottante(request)
        return redirect('carrello')
    # Stesso ragionamento di elimina_elementi_dal_carrello qui sopra
    if _e_richiesta_in_background(request):
        return HttpResponse(status=401)
    return redirect('carrello')

@require_POST
def settaggio_quantita(request, carrelloId):
    # "cliente_id=request.user.pk" (non "cliente=request.user"): questa riga
    # gira anche per un utente anonimo (il controllo is_authenticated e'
    # sotto), e filtrare una ForeignKey con un AnonymousUser al posto di
    # un'istanza del modello utente solleva un ValueError - confrontare i pk
    # (None per l'anonimo) evita il problema restando comunque un 404 pulito
    elemento_carrello = get_object_or_404(Carrello, pk=carrelloId, cliente_id=request.user.pk)
    if request.user.is_authenticated:
        carrello_form = CarrelloForm(request.POST)
        # is_valid() esplicito (non piu' solo save(commit=False)): un valore
        # non numerico/mancante (campo svuotato) faceva sollevare ValueError
        # a save(), mai gestito - con la quantita' scrivibile da tastiera
        # (non piu' solo +/-) questo caso e' ora raggiungibile, si ignora
        # semplicemente la richiesta invece di far crashare la view
        if carrello_form.is_valid():
            quantita = carrello_form.cleaned_data['quantita']
            logger.info(f"Richiesta settaggio quantita {quantita} prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
            if quantita <= 0:
                logger.debug(f"Eliminato il prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk} perchè andava sotto l'1")
                elemento_carrello.delete()
            else:
                elemento_carrello.quantita = quantita
                elemento_carrello.save()
            logger.info(f"Effettuato settaggio quantita {quantita} prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        if _e_richiesta_in_background(request):
            return _render_frammento_azione_carrello(request)
        return redirect('carrello')
    if _e_richiesta_in_background(request):
        return HttpResponse(status=401)
    return redirect('carrello')



@require_POST
def aumenta_quantita_carrello(request, carrelloId):
    # is_authenticated va controllato PRIMA della query: un utente anonimo
    # (es. sessione scaduta a pagina aperta) farebbe comunque sollevare
    # Http404 a get_object_or_404 (nessuna riga ha "cliente_id=None"),
    # restituendo un 404 semplice invece del 401 esplicito richiesto qui
    # sotto per le richieste in background - stesso ragionamento gia'
    # applicato a elimina_elementi_dal_carrello
    if request.user.is_authenticated:
        elemento_carrello = get_object_or_404(Carrello, pk=carrelloId, cliente=request.user)
        logger.info(f"Richiesta aumento quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        elemento_carrello.quantita += 1
        elemento_carrello.save()
        logger.info(f"Effettuata richiesta aumento quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        if _e_richiesta_in_background(request):
            return _render_frammento_azione_carrello(request)
        return redirect('carrello')
    if _e_richiesta_in_background(request):
        return HttpResponse(status=401)
    return redirect('carrello')


@require_POST
def diminuisci_quantita_carrello(request, carrelloId):
    # Stesso ragionamento di aumenta_quantita_carrello qui sopra
    if request.user.is_authenticated:
        elemento_carrello = get_object_or_404(Carrello, pk=carrelloId, cliente=request.user)
        logger.info(f"Richiesta diminuzione quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        quantita = elemento_carrello.quantita
        if quantita == 1:
            logger.debug(f"Eliminato il prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk} perchè andava sotto l'1")
            elemento_carrello.delete()
        else:
            elemento_carrello.quantita -= 1
            elemento_carrello.save()
        logger.info(f"Effettuata richiesta aumento quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        if _e_richiesta_in_background(request):
            return _render_frammento_azione_carrello(request)
        return redirect('carrello')
    if _e_richiesta_in_background(request):
        return HttpResponse(status=401)
    return redirect('carrello')