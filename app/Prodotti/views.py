from typing import Any
from django.shortcuts import render
from django.views.generic import ListView, DetailView
from .models import Categoria, Prodotto, Sottocategoria, ImmaginiArticolo, SchedeTecniche, DEFAULT_IMMAGINE_ARTICOLO, puo_vedere_precursori
from django.template import loader
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.core.paginator import Paginator
from django.db.models import Q
from urllib.parse import urlencode

def catalogo_home(request):
    return {
        'categoria': Categoria.objects.all()
    }

def _filtra_precursori(queryset, user):
    if puo_vedere_precursori(user):
        return queryset
    return queryset.filter(Q(precursore__isnull=True) | Q(precursore=''))

def _is_ajax_request(request):
    # Stesso pattern gia' usato in Carrello/views.py per
    # "aggiungi_prodotti_al_carrello": l'header lo manda il fetch() del
    # JS (vedi app/static/js/filtro-prodotti-ajax.js), mai un browser in
    # una richiesta di navigazione normale
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'

class ProdottoListView(ListView):
    model = Prodotto
    template_name = "prodotti_card.html"
    context_object_name = 'prodotti'
    paginate_by = 9

    def get_queryset(self):  # new
        query = self.request.GET.get("query")
        if query is None:
            query = ''
            return {}
        object_list = Prodotto.objects.filter(
            Q(codice_prodotto__icontains=query) | Q(nome_prodotto__icontains=query)
        )
        return _filtra_precursori(object_list, self.request.user)

    def get_template_names(self):
        if _is_ajax_request(self.request):
            return ['partials/griglia_prodotti.html']
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = {}
        categoria = Categoria.objects.get(pk=self.kwargs['pk'])
        context['nome_categoria'] = categoria.nome_categoria
        query = self.request.GET.get('query', '')
        # Usato dal template per il messaggio "nessun prodotto trovato"
        # quando la ricerca non da' risultati (vedi sotto)
        context['query'] = query
        # Se la ricerca parte da una pagina gia' filtrata per sottocategoria
        # (vedi campo nascosto "sottocategoria" nel form in prodotti_card.html),
        # il risultato resta ristretto a quella sottocategoria invece di
        # coprire l'intera categoria
        sottocategoria_pk = None
        sottocategoria_pk_raw = self.request.GET.get('sottocategoria')
        if sottocategoria_pk_raw:
            try:
                sottocategoria_pk = int(sottocategoria_pk_raw)
            except ValueError:
                sottocategoria_pk = None
        # Usato dal template per segnalare al JS (vedi
        # filtro-prodotti-ajax.js) di avvisare l'utente con un toast e
        # pulire il campo di ricerca, invece di mostrare una lista vuota
        context['ricerca_senza_risultati'] = False
        # "'query' in GET" (non "if self.object_list"): una ricerca senza
        # risultati restituisce un queryset vuoto, falsy quanto il "{}"
        # sentinella usato in get_queryset() per "nessun parametro query"
        # (richiesta diretta all'URL, non dal form) - il vecchio controllo
        # confondeva i due casi, lasciando "prodotti" non impostato anche
        # per una ricerca legittima senza risultati. Il template ne aveva
        # bisogno per decidere se mostrare la paginazione (paginator.py
        # gestisce bene un queryset vuoto, un controllo diverso da qui non
        # serve)
        if 'query' in self.request.GET:
            prodotti = self.object_list.filter(categoria_id=categoria.pk)
            if sottocategoria_pk is not None:
                prodotti = prodotti.filter(sottocategoria_id=sottocategoria_pk)
            if query and not prodotti.exists():
                # Nessun risultato per la ricerca (non "query" vuota, che
                # con "icontains" corrisponderebbe comunque a tutto):
                # invece di mostrare una lista vuota, si torna a mostrare
                # l'intera categoria - sottocategoria inclusa, azzerata
                # anche lei, come chiesto ("tutti i prodotti della
                # categoria corrente")
                context['ricerca_senza_risultati'] = True
                sottocategoria_pk = None
                prodotti = _filtra_precursori(Prodotto.objects.filter(categoria_id=categoria.pk), self.request.user)
            paginator = Paginator(prodotti, self.paginate_by)
            page_number = self.request.GET.get('page')
            prodotti = paginator.get_page(page_number)
            context['prodotti'] = prodotti
        context['categoria_pk'] = categoria.pk
        context['sottocategorie'] = Sottocategoria.objects.filter(categoria_id=categoria.pk)
        context['sottocategoria_corrente_pk'] = sottocategoria_pk
        # I link di paginazione (vedi "extra_querystring" in prodotti_card.html)
        # devono portarsi dietro ricerca e sottocategoria attiva, altrimenti
        # cliccare "pagina 2" da un risultato di ricerca perderebbe la ricerca
        extra_params = {}
        if query:
            extra_params['query'] = query
        if sottocategoria_pk is not None:
            extra_params['sottocategoria'] = sottocategoria_pk
        context['extra_querystring'] = ('&' + urlencode(extra_params)) if extra_params else ''
        return context

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
        prodotti = _filtra_precursori(prodotti, self.request.user)
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
        context['sottocategoria_corrente_pk'] = sottocategoria.codice_sottocategoria
        template_name = 'partials/griglia_prodotti.html' if _is_ajax_request(request) else self.template_name
        return render(request, template_name, context)

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
            prodotti = _filtra_precursori(prodotti, request.user)
        else:
            self.template_name = 'prodotti_card.html'
            if nome_categoria.casefold() == "prodotti per piscine":
                prodotti_gruppo_true = Prodotto.objects.filter(gruppo=1)
                prodotti = prodotti | prodotti_gruppo_true
            prodotti = _filtra_precursori(prodotti, request.user)
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
        template_name = self.template_name
        # Il ramo "prodotti chimici" usa prodotti_tabella.html (tabella
        # DataTables, paginazione/filtro tutti diversi): il partial AJAX
        # esiste solo per prodotti_card.html, quindi si applica solo li'
        if _is_ajax_request(request) and template_name == 'prodotti_card.html':
            template_name = 'partials/griglia_prodotti.html'
        return render(request, template_name, context=dict)

