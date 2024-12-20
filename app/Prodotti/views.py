from typing import Any
from django.shortcuts import render, redirect
from django.views.generic import ListView, DetailView
from .models import Categoria, Prodotto, Sottocategoria, ImmaginiArticolo, SchedeTecniche
from django.template import loader
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.core.paginator import Paginator
from django.db.models import Q
import os
from SitoWeb import settings
# Create your views here.

def catalogo_home(request):
    return {
        'categoria': Categoria.objects.all()
    }

class ProdottoListView(ListView):
    model = Prodotto
    template_name = "prodotti_card.html"
    context_object_name = 'prodotti'

    def get_queryset(self):  # new
        query = self.request.GET.get("query")
        if query is None:
            query = ''
            return {}
        object_list = Prodotto.objects.filter(
            Q(codice_prodotto__icontains=query) | Q(descrizione__icontains=query)
        )  
        return object_list
 
    def get_context_data(self, **kwargs):
        context = {}
        categoria = Categoria.objects.get(pk=self.kwargs['pk'])    
        context['nome_categoria'] = categoria.nome_categoria
        if self.object_list:
            context['prodotti'] = self.object_list.filter(categoria_id=categoria.pk)
        context['categoria_pk'] = categoria.pk
        context['sottocategorie'] = Sottocategoria.objects.filter(categoria_id=categoria.pk)   
        return context
#configuraImmagini()

class CatalogoView(ListView):
    model = Categoria
    template_name='catalogo.html'

    def get_context_data(self, **kwargs: Any) -> dict[str, Any]:
        context = super().get_context_data(**kwargs)
        if self.request.user.is_authenticated:
            elementi_carrello_utente = self.request.user.elementi_carrello.all()
            context["totale_elementi_carrello"] = sum([elemento.quantita for elemento in elementi_carrello_utente])

        return context

class SottocategoriaListView(ListView):
    model = Prodotto
    template_name = 'prodotti_card.html'
    paginate_by = 9

    def get(self, request, **kwargs):
        context = {}
        categoria = Categoria.objects.get(pk=self.kwargs['pk_categoria'])
        nome_categoria = categoria.nome_categoria
        sottocategoria = Sottocategoria.objects.get(codice_sottocategoria=self.kwargs['pk_sottocategoria'])
        prodotti = Prodotto.objects.filter(categoria_id=categoria.pk)
        if nome_categoria.casefold()=='prodotti per piscine':
            prodotti_gruppo_true = Prodotto.objects.filter(gruppo=1)
            prodotti = prodotti | prodotti_gruppo_true
        prodotti = prodotti.filter(sottocategoria_id=sottocategoria.codice_sottocategoria)
        paginator = Paginator(prodotti,self.paginate_by)
        page_number=request.GET.get('page')
        prodotti=paginator.get_page(page_number)
        if self.request.user.is_authenticated:
            elementi_carrello_utente = self.request.user.elementi_carrello.all()
            context["totale_elementi_carrello"] = sum([elemento.quantita for elemento in elementi_carrello_utente])
        context['prodotti'] = prodotti
        context['nome_categoria'] = sottocategoria.nome_sottocategoria
        context['categoria_pk'] = categoria.pk
        context['sottocategorie'] = Sottocategoria.objects.filter(categoria_id=categoria.pk)
        return render(request, self.template_name, context)  

class CatalogoListView(ListView):
    model = Prodotto
    template_name=''
    paginate_by = 9

    def get(self, request, **kwargs):
        dict = {}
        categoria = Categoria.objects.get(pk=self.kwargs['pk'])
        prodotti = Prodotto.objects.filter(categoria_id=categoria.pk)
        nome_categoria = categoria.nome_categoria
        if nome_categoria.casefold() == "prodotti chimici":
            self.template_name = 'prodotti_tabella.html'
        else:
            self.template_name = 'prodotti_card.html'
            if nome_categoria.casefold() == "prodotti per piscine":
                prodotti_gruppo_true = Prodotto.objects.filter(gruppo=1)
                prodotti = prodotti | prodotti_gruppo_true
            paginator = Paginator(prodotti,self.paginate_by)
            page_number=request.GET.get('page')
            prodotti=paginator.get_page(page_number)
        if self.request.user.is_authenticated:
            elementi_carrello_utente = self.request.user.elementi_carrello.all()
            dict["totale_elementi_carrello"] = sum([elemento.quantita for elemento in elementi_carrello_utente])
        dict['prodotti'] = prodotti
        dict['nome_categoria'] = nome_categoria
        dict['categoria_pk'] = categoria.pk
        dict['sottocategorie'] = Sottocategoria.objects.filter(categoria_id=categoria.pk)
        return render(request, self.template_name, context=dict)  

'''
    def get_template_names(self, **kwargs):
        pk = self.kwargs['pk']
        if pk==1:
            return ['prodotti_tabella.html']
        return ['prodotti_card.html']

    def get_context_data(self, **kwargs):
        context = {}
        pk = self.kwargs['pk']
        categoria =  Categoria.objects.get(pk=pk)
        prodotti = Prodotto.objects.filter(categoria_id=pk)
        if pk==6:
            prodotti_gruppo_true = Prodotto.objects.filter(gruppo=1)
            prodotti = prodotti | prodotti_gruppo_true
        context['prodotti'] = prodotti
        context['nome_categoria'] = categoria.nome_categoria
        context['sottocategorie'] = Sottocategoria.objects.filter(categoria_id=categoria.pk)
        return context
'''

'''  
    def get_queryset(self,  **kwargs):
        pk = self.kwargs['pk']
        prodotti = Prodotto.objects.filter(categoria_id=pk)
        if pk==6:
            prodotti_gruppo_true = Prodotto.objects.filter(gruppo=1)
            prodotti = prodotti | prodotti_gruppo_true
        return prodotti
'''
#SETUP DI SOTTOCATEGORIA_ID DI PRODOTTO
def ConfiguraSottocategoiaIdArticoli():
    articoli = Prodotto.objects.all()
    for articolo in articoli:
        articolo.save()

#ConfiguraSottocategoiaIdArticoli() 

#PRE-POPOLAMENTO
def ConfiguraImmaginiArticoli():
    articoli = Prodotto.objects.all()
    for articolo in articoli:
        immagine_articolo = ImmaginiArticolo()
        immagine_articolo.articolo = articolo
        immagine_articolo.immagine = "/mediafiles/default_immagine_articolo/saniscope_logo 2.png"
        immagine_articolo.save()
        
#ConfiguraImmaginiArticoli()

#INSERIMENTO IMMAGINI
def configuraImmagini():
    immagini = os.listdir(os.getcwd() + "/mediafiles/immagini_articoli/")
    for immagine in immagini:
        posizione_dot = immagine.find('.')
        nome_immagine = immagine[:posizione_dot]
        articolo= Prodotto.objects.filter(codice_prodotto=nome_immagine).first()
        if articolo is not None:
            articolo = articolo.immagine_rel
            articolo.immagine = '/media/immagini_articoli/' + immagine
            articolo.save()

#configuraImmagini()
                
def ConfiguraSchedeArticoli():
    articoli = Prodotto.objects.all()
    for articolo in articoli:
        immagine_articolo = SchedeTecniche()
        immagine_articolo.articolo = articolo
        immagine_articolo.save()

#ConfiguraSchedeArticoli()
        
def configuraSchede():
    schede = os.listdir(os.getcwd() + "/mediafiles/schede_tecniche/")
    for scheda in schede:
        posizione_dot = scheda.find('.')
        nome_scheda = scheda[:posizione_dot]
        articolo= Prodotto.objects.filter(codice_prodotto=nome_scheda).first()
        if articolo is not None:
            articolo = articolo.scheda_rel
            articolo.scheda = "/mediafiles/schede_tecniche/" + scheda
            articolo.save()

#configuraSchede()


def controllaImmaginiArticolo():
    numeroElementi = ImmaginiArticolo.objects.count()
    if numeroElementi > 1:    
        ImmaginiArticolo.objects.all().delete()
    ConfiguraImmaginiArticoli()
    configuraImmagini()

def controllaSchedeTecniche():
    numeroElementi = SchedeTecniche.objects.count()
    if numeroElementi > 1:
        SchedeTecniche.objects.all().delete()
    ConfiguraSchedeArticoli()
    configuraSchede()

def sincronizzazione(self):        #aggiorno tabelle
   controllaImmaginiArticolo()
   controllaSchedeTecniche()
   return redirect('home')   
#sincronizzazione() 

