from django.db.models.query import QuerySet
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from Carrello.models import Carrello
from .models import Preventivo, Elementi_Preventivo
from .forms import DettaglioPreventivoForm
from django.views.generic import ListView
from typing import Any, Dict
from InvioEmail.views import emailPreventivo
from django.core.paginator import Paginator
import logging

# Create your views here.


class PreventivoListView(ListView):
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
        for elemento_carrello in carrello:
            elemento_ordine = Elementi_Preventivo.objects.create(preventivo = preventivo, prodotto = elemento_carrello.prodotto, quantita = elemento_carrello.quantita)
            elemento_ordine.save()
        emailPreventivo(request, carrello, dettaglio_preventivo, preventivo)
        carrello.delete()
        
        return redirect('lista_ordini')

class PreventivoDetailView(ListView):
    model = Preventivo
    template_name = "dettaglio_preventivo.html"

    def get_queryset(self) -> QuerySet[Any]:
        preventivo = Preventivo.objects.get(pk=self.kwargs['pk'])
        object_list = preventivo.elementi_preventivo.all()
        return object_list

    def get_context_data(self, **kwargs: Any) -> Dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["totale_elementi_ordine"] = sum([elemento.quantita for elemento in self.object_list])
        return context
        
