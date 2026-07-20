from django.forms import BaseModelForm
from django.shortcuts import render, redirect, HttpResponse
from django.views.generic import TemplateView
from .forms import ClienteForm, MessaggioForm
from .models import Cliente, Richiesta_messaggio, Registrati
from Preventivo.models import Preventivo
from django.views.generic import CreateView, DeleteView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin
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
            #logger.info(f"Messaggio dell'utente con id: {request.user.pk} ed email {request.user.email}")
            cliente_obj = cliente.save()
            messaggio_obj = messaggio.save()
            richiesta = Richiesta_messaggio()
            richiesta.cliente_id = cliente_obj.pk
            richiesta.messaggio_id = messaggio_obj.pk
            richiesta.save()
            emailMessaggio(request, cliente_obj, messaggio_obj)
            
            return render(request, "home.html", )
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

        # Salva prima l'utente: se l'invio dell'email di benvenuto sotto
        # dovesse fallire (dominio non recapitabile, server SMTP giu', ecc.),
        # l'account esiste comunque - prima l'ordine era invertito e un
        # fallimento dell'invio impediva la creazione dell'account, con un
        # errore 500 non gestito mostrato all'utente
        response = super().form_valid(form)

        logger.info(f"Si è registarto con l'email {self.object.email}")

        # Oggetto "usa e getta" solo per il testo dell'email di benvenuto:
        # serve la password in chiaro (quella su self.object e' gia' l'hash),
        # non viene mai salvato su DB
        registrato = Registrati(
            email=self.object.email,
            first_name=self.object.first_name,
            password=form.cleaned_data.get("password1"),
        )
        try:
            registrato.email_user()
        except Exception:
            logger.exception(f"Invio email di benvenuto fallito per {registrato.email}")

        return response

class ProfiloView (TemplateView):
    
    template_name = "profilo.html"

class UtenteDeleteView (LoginRequiredMixin, DeleteView):
    template_name = "conferma_cancellazione_profilo.html"
    success_url = reverse_lazy('home')
    model = Registrati

    def get_queryset(self):
        # Un utente puo' cancellare solo il proprio account, non quello di
        # altri: prima non c'era alcun filtro qui, quindi bastava cambiare
        # il pk nell'URL per cancellare l'account di un altro cliente
        return Registrati.objects.filter(pk=self.request.user.pk)

    def get_context_data(self, **kwargs):
        logger = logging.getLogger(__name__)
        context = {}

        registrato = self.object
        logger.info(f"Richiesta cancellazione utente con id {registrato.pk}")
        context['emailRegistrato'] = registrato.email
        context['preventivi'] = Preventivo.objects.filter(cliente_id = registrato.pk)
        context['messaggi'] = Richiesta_messaggio.objects.filter(cliente_id = registrato.pk)

        return context

    def delete(self, *args, **kwargs):

        return super().delete(*args, **kwargs)

class Profilo(LoginRequiredMixin, UpdateView):

    model = Registrati
    template_name = "profilo.html"
    success_url=reverse_lazy("home")

    def get_queryset(self):
        # Un utente puo' modificare solo il proprio profilo, non quello di
        # altri: prima non c'era alcun filtro, quindi bastava cambiare il pk
        # nell'URL per modificare i dati (email compresa) di un altro
        # utente - potenzialmente un modo per rubare l'account cambiandone
        # l'email e poi usando "password dimenticata"
        return Registrati.objects.filter(pk=self.request.user.pk)

    fields = [
            "email",
            "first_name",
            "cognome_ragione_sociale",
            "codiceFiscale_PartitaIVA",
            "indirizzo",
            "citta",
            "telefono",
    ] 
  