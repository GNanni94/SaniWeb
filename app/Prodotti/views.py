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

def _prodotti_categoria(categoria, user):
    prodotti = Prodotto.objects.filter(categoria_id=categoria.pk)
    if categoria.nome_categoria.casefold() == 'prodotti per piscine':
        prodotti = prodotti | Prodotto.objects.filter(gruppo=1)
    return _filtra_precursori(prodotti, user)

def _is_ajax_request(request):
    # Header mandato dal fetch() del JS, mai da una richiesta di navigazione normale
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'

class ProdottoListView(ListView):
    model = Prodotto
    template_name = "prodotti_card.html"
    context_object_name = 'prodotti'
    paginate_by = 9

    def get_queryset(self):
        query = self.request.GET.get("query")
        if query is None:
            return Prodotto.objects.none()
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
        context['query'] = query
        # Sottocategoria dal campo nascosto del form in prodotti_card.html
        sottocategoria_pk = None
        sottocategoria_pk_raw = self.request.GET.get('sottocategoria')
        if sottocategoria_pk_raw:
            try:
                sottocategoria_pk = int(sottocategoria_pk_raw)
            except ValueError:
                sottocategoria_pk = None
        # Usato dal JS per mostrare un toast e pulire il campo di ricerca
        context['ricerca_senza_risultati'] = False
        # "'query' in GET" distingue una ricerca senza risultati (queryset
        # vuoto ma "prodotti" va comunque impostato, per la paginazione) da
        # "nessun parametro query" (richiesta diretta all'URL, non dal form)
        if 'query' in self.request.GET:
            prodotti = self.object_list.filter(categoria_id=categoria.pk)
            if sottocategoria_pk is not None:
                prodotti = prodotti.filter(sottocategoria_id=sottocategoria_pk)
            if query and not prodotti.exists():
                # Ricerca senza risultati: torna a mostrare tutta la categoria
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
        # Query string da aggiungere ai link di paginazione (ricerca e sottocategoria attiva)
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

class SottocategoriaListView(ListView):
    model = Prodotto
    template_name = 'prodotti_card.html'
    paginate_by = 9

    def get(self, request, **kwargs):
        context = {}
        categoria = Categoria.objects.get(pk=self.kwargs['pk_categoria'])
        sottocategoria = Sottocategoria.objects.get(codice_sottocategoria=self.kwargs['pk_sottocategoria'])
        prodotti = _prodotti_categoria(categoria, self.request.user)
        prodotti = prodotti.filter(sottocategoria_id=sottocategoria.codice_sottocategoria)
        paginator = Paginator(prodotti,self.paginate_by)
        page_number=request.GET.get('page')
        prodotti=paginator.get_page(page_number)
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
        context = {}
        categoria = Categoria.objects.get(pk=self.kwargs['pk'])
        nome_categoria = categoria.nome_categoria
        if nome_categoria.casefold() == "prodotti chimici":
            template_name = 'prodotti_tabella.html'
            prodotti = _filtra_precursori(Prodotto.objects.filter(categoria_id=categoria.pk), request.user)
        else:
            template_name = 'prodotti_card.html'
            prodotti = _prodotti_categoria(categoria, request.user)
            paginator = Paginator(prodotti,self.paginate_by)
            page_number=request.GET.get('page')
            prodotti=paginator.get_page(page_number)
        context['prodotti'] = prodotti
        context['nome_categoria'] = nome_categoria
        context['categoria_pk'] = categoria.pk
        context['sottocategorie'] = Sottocategoria.objects.filter(categoria_id=categoria.pk)
        # Il partial AJAX esiste solo per prodotti_card.html
        if _is_ajax_request(request) and template_name == 'prodotti_card.html':
            template_name = 'partials/griglia_prodotti.html'
        return render(request, template_name, context=context)

