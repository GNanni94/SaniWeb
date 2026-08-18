from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from Carrello.models import Carrello
from Prodotti.models import mostra_precursori
from .models import Preventivo, Elementi_Preventivo
from .forms import DettaglioPreventivoForm
from django.views.generic import ListView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from typing import Any, Dict
from InvioEmail.views import emailPreventivo
from django.core.paginator import Paginator
import logging

# Create your views here.


class PreventivoListView(LoginRequiredMixin, ListView):
    model = Preventivo
    template_name = "preventivo.html"
    paginate_by = 8
    
    def get(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        context = {}
        object_list = self.request.user.ordini.all()
        paginator = Paginator(object_list,self.paginate_by)
        page_number=request.GET.get('page')
        object_list=paginator.get_page(page_number)
        context["object_list"] = object_list
        return render(request, self.template_name, context)

def crea_ordine_da_carrello(request):
    #logger = logging.getLogger(__name__)
    if request.user.is_authenticated:
        #logger.info(f"Creato ordene dal carrello dell'utente con id: {request.user.pk} ed email {request.user.email}")
        preventivo = Preventivo()
        preventivo.cliente = request.user
        preventivo.save()

        dettaglio_form = DettaglioPreventivoForm(request.POST)

        dettaglio_preventivo = dettaglio_form.save(commit=False)
        dettaglio_preventivo.preventivo = preventivo
        dettaglio_preventivo.save()
        dettaglio_form.save_m2m()

        carrello = Carrello.objects.filter(cliente = request.user)
        # Punto di enforcement per i precursori: qui, non nei singoli punti
        # di mutazione del carrello (aumenta_quantita_carrello,
        # settaggio_quantita), perche' e' qui che il carrello diventa
        # davvero una richiesta d'ordine. Una riga di carrello con
        # precursore non consentito (es. rimasta da prima di questo
        # controllo) viene scartata invece di diventare una riga
        # dell'ordine - vedi design del 2026-08-18
        elementi_inclusi = []
        for elemento_carrello in carrello:
            if elemento_carrello.prodotto.precursore and not mostra_precursori(request.user):
                continue
            elemento_ordine = Elementi_Preventivo.objects.create(preventivo = preventivo, prodotto = elemento_carrello.prodotto, quantita = elemento_carrello.quantita)
            elemento_ordine.save()
            elementi_inclusi.append(elemento_carrello)
        if len(elementi_inclusi) < len(carrello):
            messages.warning(request, 'Uno o piu\' prodotti riservati ai clienti azienda non sono stati inclusi nella richiesta.', extra_tags='precursore-riservato')
        # L'email allo staff riporta solo gli elementi effettivamente
        # inclusi nell'ordine (elementi_inclusi), non l'intero carrello:
        # altrimenti un prodotto con precursore scartato qui sopra
        # resterebbe comunque visibile allo staff, che potrebbe evaderlo
        # manualmente aggirando cosi' il blocco
        emailPreventivo(request, elementi_inclusi, dettaglio_preventivo, preventivo)
        carrello.delete()
        
        return redirect('lista_ordini')

def aggiungi_preventivo_al_carrello(request, pk):
    if request.user.is_authenticated:
        # Stesso filtro di proprieta' di PreventivoDetailView: un cliente puo'
        # riutilizzare solo i propri preventivi passati, non quelli altrui
        preventivo = get_object_or_404(Preventivo, pk=pk, cliente=request.user)
        almeno_un_elemento_saltato = False
        for elemento_preventivo in preventivo.elementi_preventivo.all():
            # Un vecchio preventivo puo' contenere un prodotto con
            # precursore richiesto prima che questo controllo esistesse:
            # va saltato qui, non solo bloccato in
            # Carrello/views.py:aggiungi_prodotti_al_carrello, altrimenti
            # "Riusa preventivo" aggirerebbe comunque quel blocco
            if elemento_preventivo.prodotto.precursore and not mostra_precursori(request.user):
                almeno_un_elemento_saltato = True
                continue
            elemento_carrello, created = Carrello.objects.get_or_create(cliente=request.user, prodotto=elemento_preventivo.prodotto)
            elemento_carrello.quantita += elemento_preventivo.quantita
            elemento_carrello.save()
        if almeno_un_elemento_saltato:
            messages.warning(request, 'Uno o piu\' prodotti riservati ai clienti azienda non sono stati aggiunti al carrello.', extra_tags='precursore-riservato')
        # Il carrello non ha campi messaggio/luogo (appartengono al
        # Dettaglio_Preventivo, creato solo quando si conferma "Richiedi
        # preventivo"): li passiamo in sessione cosi' CarrelloListView puo'
        # precompilare il form con i valori del vecchio preventivo
        dettaglio_preventivo = preventivo.dettaglio_preventivo
        request.session['messaggio_precompilato'] = dettaglio_preventivo.messaggio
        request.session['luogo_precompilato'] = dettaglio_preventivo.luogo
        messages.success(request, 'Articoli aggiunti al carrello! Puoi aggiungerne altri prima di richiedere il nuovo preventivo.')
        return redirect('carrello')
    return redirect('login')

class PreventivoDetailView(LoginRequiredMixin, ListView):
    model = Preventivo
    template_name = "dettaglio_preventivo.html"

    def get_queryset(self) -> QuerySet[Any]:
        # Un utente puo' vedere solo il dettaglio dei propri preventivi, non
        # quelli di altri clienti: prima non c'era alcun filtro sul
        # proprietario, bastava cambiare il pk nell'URL per vedere prodotti,
        # quantita' e dati di un preventivo altrui
        self.preventivo = get_object_or_404(Preventivo, pk=self.kwargs['pk'], cliente=self.request.user)
        object_list = self.preventivo.elementi_preventivo.all()
        return object_list

    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["totale_elementi_ordine"] = sum([elemento.quantita for elemento in self.object_list])
        context["preventivo"] = self.preventivo
        context["dettaglio_preventivo"] = self.preventivo.dettaglio_preventivo
        return context
        
