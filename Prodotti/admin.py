from django.contrib import admin
from .models import Prodotto, Categoria, Sottocategoria, ImmaginiArticolo, SchedeTecniche

# Register your models here.

#admin.site.register(Prodotto)
#admin.site.register(Categoria)
#admin.site.register(Sottocategoria)
admin.site.register(ImmaginiArticolo)
admin.site.register(SchedeTecniche)


@admin.register(Prodotto)
class ProdottoAdmin(admin.ModelAdmin):

    list_display = ['pk','codice_prodotto', 'nome_prodotto', 'descrizione', 'unita_di_misura', 'gruppo', 'categoria', 'sottocategoria']
    search_fields = ['pk','codice_prodotto','nome_prodotto', 'descrizione']

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):    
    list_display = ['pk', 'nome_categoria', 'immagine_categoria' ]
    search_fields = ['nome_categoria']

@admin.register(Sottocategoria)
class SottocategoriaAdmin(admin.ModelAdmin):
    list_display = ['pk', 'nome_sottocategoria', 'codice_sottocategoria', 'categoria']
    search_fields = ['nome_sottocategoria']


#@admin.register(ImmaginiArticolo)
#class ImmaginiArticoloAdmin(admin.ModelAdmin):
#    list_display = ['pk', 'descrizione']