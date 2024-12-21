from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import ListView, DetailView  # new
from django.views.generic.edit import UpdateView, DeleteView, CreateView  # new
from .models import Carrello
from Prodotti.models import Prodotto
from django.contrib import messages
from typing import Any, Dict
from Preventivo.forms import DettaglioPreventivoForm
from Preventivo.models import Preventivo, Dettaglio_Preventivo, Elementi_Preventivo
from .forms import CarrelloForm
import json
import logging

logger = logging.getLogger(__name__)

# Create your views here.
class CarrelloListView(ListView):
    
    model = Carrello
    template_name = "carrello.html"

    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        context = super().get_context_data(**kwargs)
        elementi_carrello_utente = self.request.user.elementi_carrello.all()
        context["object_list"] = elementi_carrello_utente
        context["form"] = CarrelloForm()        
        context["preventivo"] = DettaglioPreventivoForm()
        context["totale_elementi_carrello"] = sum([elemento.quantita for elemento in elementi_carrello_utente])
        return context

def elementi_carrello(request):
    elementi_carrello_utente = request.user.elementi_carrello.all()
    context={}
    context['totale_elementi_carrello'] = sum([elemento.quantita for elemento in elementi_carrello_utente])
    return render(request, 'base.html', context)

def aggiungi_prodotti_al_carrello(request, prodottoId):
    prodotto = get_object_or_404(Prodotto, pk=prodottoId)
    if request.user.is_authenticated:
        logger.info(f"Richiesta aggiunta prodotto {prodottoId} al carrello dell'utente {request.user.pk}")
        elemento_carrello, created = Carrello.objects.get_or_create(cliente = request.user , prodotto = prodotto)
        elemento_carrello.quantita += 1
        elemento_carrello.save()
        messages.success(request, 'Carrello aggiornato!')
        return redirect(prodotto) 
    return redirect('login')     

def elimina_elementi_dal_carrello(request, carrelloId):
    if request.user.is_authenticated:
        logger.info(f"Richiesta eliminazione elemento carrello {carrelloId} utente {request.user.pk}")
        Carrello.objects.filter(id = carrelloId).delete()
        logger.info(f"Effettuata richiesta eliminazione elemento carrello {carrelloId} utente {request.user.pk}")
    return redirect('carrello')   

def settaggio_quantita(request, carrelloId):
    elemento_carrello = get_object_or_404(Carrello, pk=carrelloId)
    if request.user.is_authenticated:
        carrello_form = CarrelloForm(request.POST)
        datiForm = carrello_form.save(commit=False)
        logger.info(f"Richiesta settaggio quantita {datiForm.quantita} prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        datiForm.prodotto = elemento_carrello.prodotto
        datiForm.cliente = request.user
         
        if datiForm.quantita  == 0:
            logger.debug(f"Eliminato il prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk} perchè andava sotto l'1")
            elemento_carrello.delete()
        else:  
            elemento_carrello.quantita = datiForm.quantita 
            elemento_carrello.save()
        logger.info(f"Effettuato settaggio quantita {datiForm.quantita} prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
    return redirect('carrello')



def aumenta_quantita_carrello(request, carrelloId):
    elemento_carrello = get_object_or_404(Carrello, pk=carrelloId)
    if request.user.is_authenticated:
        logger.info(f"Richiesta aumento quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        elemento_carrello.quantita += 1
        elemento_carrello.save()
        logger.info(f"Effettuata richiesta aumento quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
    return redirect('carrello')      


def diminuisci_quantita_carrello(request, carrelloId):
    elemento_carrello = get_object_or_404(Carrello, pk=carrelloId)
    if request.user.is_authenticated:
        logger.info(f"Richiesta diminuzione quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        quantita = elemento_carrello.quantita
        if quantita == 1:
            logger.debug(f"Eliminato il prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk} perchè andava sotto l'1")
            elemento_carrello.delete()
        else:    
            elemento_carrello.quantita -= 1
            elemento_carrello.save()
        logger.info(f"Effettuata richiesta aumento quantita prodotto {elemento_carrello.prodotto.pk} carrello {carrelloId} utente {request.user.pk}")
        
    return redirect('carrello')      