from django.forms import BaseModelForm
from django.shortcuts import render, redirect, HttpResponse
from django.views.generic import TemplateView
from .forms import ClienteForm, MessaggioForm
from .models import Cliente, Richiesta_messaggio, Registrati
from Preventivo.models import Preventivo
from django.views.generic import CreateView, DeleteView, UpdateView
from django.urls import reverse_lazy
from .forms import ClienteCreationForm
from InvioEmail.views import emailMessaggio
import logging



def messaggio(request):
    logger = logging.getLogger(__name__)
    if request.method == 'POST':
        cliente = ClienteForm(request.POST)
        messaggio = MessaggioForm(request.POST)
        if cliente.is_valid() and messaggio.is_valid():
            logger.info(f"Messaggio dell'utente con id: {request.user.pk} ed email {request.user.email}")
            cliente_obj = cliente.save()
            messaggio_obj = messaggio.save()
            richiesta = Richiesta_messaggio()
            richiesta.cliente_id = cliente_obj.pk
            richiesta.messaggio_id = messaggio_obj.pk
            richiesta.save()
            emailMessaggio(request, cliente_obj, messaggio_obj)
            
            return render(request, "contatti.html", )
    else:
        cliente = ClienteForm()
        messaggio = MessaggioForm()
    return render(request, "contatti.html", {"cliente": cliente, "messaggio": messaggio})



class SignUpView(CreateView):
    form_class = ClienteCreationForm
    success_url = reverse_lazy("login")
    template_name = "registration/signup.html"

    def form_valid(self, form) -> HttpResponse:
        logger = logging.getLogger(__name__)
        form_cleaned = form.cleaned_data
        registrato = Registrati()
        registrato.email = form_cleaned.get("email")
        registrato.first_name = form_cleaned.get("first_name")
        registrato.cognome_ragione_sociale = form_cleaned.get("cognome_ragione_sociale")
        registrato.codiceFiscale_PartitaIVA = form_cleaned.get("codiceFiscale_PartitaIVA")
        registrato.indirizzo = form_cleaned.get("indirizzo")
        registrato.citta = form_cleaned.get("citta")
        registrato.telefono = form_cleaned.get("telefono")
        registrato.password = form_cleaned.get("password1")

        logger.info(f"Si è registarto con l'email {registrato.email}")

        registrato.email_user()
        return super().form_valid(form)
    


class ProfiloView (TemplateView):
    
    template_name = "profilo.html"

class UtenteDeleteView (DeleteView):
    template_name = "conferma_cancellazione_profilo.html"
    success_url = reverse_lazy('home')
    model = Registrati

    def get_context_data(self, **kwargs):
        logger = logging.getLogger(__name__)
        context = {}
        
        registrato = Registrati.objects.get(pk=self.kwargs['pk']) 
        logger.info(f"Richiesta cancellazione utente con id {registrato.pk}")
        context['emailRegistrato'] = registrato.email
        context['preventivi'] = Preventivo.objects.filter(cliente_id = registrato.pk)
        context['messaggi'] = Richiesta_messaggio.objects.filter(cliente_id = registrato.pk)
       
        return context

    def delete(self, *args, **kwargs):

        return super(PresetDeleteView, self).delete(*args, **kwargs)

class Profilo(UpdateView):

    model = Registrati
    template_name = "profilo.html"
    success_url=reverse_lazy("home")
    

    fields = [
            "email",
            "first_name",
            "cognome_ragione_sociale",
            "codiceFiscale_PartitaIVA",
            "indirizzo",
            "citta",
            "telefono",
    ] 
  