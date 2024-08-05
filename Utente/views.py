from django.forms import BaseModelForm
from django.shortcuts import render, redirect, HttpResponse
from .forms import ClienteForm, MessaggioForm
from .models import Cliente, Messaggi, Richiesta_messaggio, Registrati
from django.views.generic import CreateView
from django.urls import reverse_lazy
from .forms import ClienteCreationForm
from InvioEmail.views import emailMessaggio



def messaggio(request):
    if request.method == 'POST':
        cliente = ClienteForm(request.POST)
        messaggio = MessaggioForm(request.POST)
        if cliente.is_valid() and messaggio.is_valid():
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
        print(form.cleaned_data)
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
        
        registrato.email_user()
        return super().form_valid(form)