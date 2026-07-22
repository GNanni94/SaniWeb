from django.contrib import admin
from .models import Prodotto, Categoria, Sottocategoria, ImmaginiArticolo, SchedeTecniche

# Register your models here.

#admin.site.register(Prodotto)
#admin.site.register(Categoria)
#admin.site.register(Sottocategoria)


@admin.register(Prodotto)
class ProdottoAdmin(admin.ModelAdmin):

    list_display = ['pk','codice_prodotto', 'nome_prodotto', 'descrizione', 'precursore', 'unita_di_misura', 'gruppo', 'categoria', 'sottocategoria']
    search_fields = ['pk','codice_prodotto','nome_prodotto', 'descrizione']

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):    
    list_display = ['pk', 'nome_categoria', 'immagine_categoria' ]
    search_fields = ['nome_categoria']

@admin.register(Sottocategoria)
class SottocategoriaAdmin(admin.ModelAdmin):
    list_display = ['pk', 'nome_sottocategoria', 'codice_sottocategoria', 'categoria']
    search_fields = ['nome_sottocategoria']


@admin.register(ImmaginiArticolo)
class ImmaginiArticoloAdmin(admin.ModelAdmin):
    list_display = ['pk', 'articolo_id', 'immagine']
    search_fields = ['=articolo__pk']

@admin.register(SchedeTecniche)
class SchedeTecnicheAdmin(admin.ModelAdmin):
    list_display = ['pk', 'articolo_id', 'scheda']
    search_fields = ['=articolo__pk']