from django.conf import settings
from django.contrib import admin
from .models import Prodotto, Categoria, Sottocategoria, ImmaginiArticolo, SchedeTecniche, DEFAULT_IMMAGINE_ARTICOLO

# Register your models here.

#admin.site.register(Prodotto)
#admin.site.register(Categoria)
#admin.site.register(Sottocategoria)


@admin.register(Prodotto)
class ProdottoAdmin(admin.ModelAdmin):

    list_display = ['pk','codice_prodotto', 'nome_prodotto', 'descrizione', 'precursore', 'unita_di_misura', 'gruppo', 'categoria', 'sottocategoria']
    search_fields = ['pk','codice_prodotto','nome_prodotto', 'descrizione']
    readonly_fields = ['sottocategoriaGestionale']

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):    
    list_display = ['pk', 'nome_categoria', 'immagine_categoria' ]
    search_fields = ['nome_categoria']

@admin.register(Sottocategoria)
class SottocategoriaAdmin(admin.ModelAdmin):
    list_display = ['pk', 'nome_sottocategoria', 'codice_sottocategoria', 'categoria']
    search_fields = ['nome_sottocategoria']
    readonly_fields = ['codice_sottocategoria']


@admin.action(description="Reimposta l'immagine di default")
def reimposta_immagine_default(modeladmin, request, queryset):
    for immagine_articolo in queryset:
        campo_immagine = immagine_articolo._meta.get_field('immagine')
        vecchio_nome = immagine_articolo.immagine.name
        if vecchio_nome and vecchio_nome != DEFAULT_IMMAGINE_ARTICOLO:
            vecchio_percorso = vecchio_nome.removeprefix(f"/{settings.MEDIA_URL.lstrip('/')}")
            if campo_immagine.storage.exists(vecchio_percorso):
                campo_immagine.storage.delete(vecchio_percorso)
        immagine_articolo.immagine = DEFAULT_IMMAGINE_ARTICOLO
        immagine_articolo.save(update_fields=['immagine'])


@admin.register(ImmaginiArticolo)
class ImmaginiArticoloAdmin(admin.ModelAdmin):
    list_display = ['pk', 'articolo_id', 'immagine']
    search_fields = ['=articolo__pk']
    actions = [reimposta_immagine_default]

@admin.register(SchedeTecniche)
class SchedeTecnicheAdmin(admin.ModelAdmin):
    list_display = ['pk', 'articolo_id', 'scheda']
    search_fields = ['=articolo__pk']