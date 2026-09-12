from django.contrib import admin
from .models import Carrello


@admin.register(Carrello)
class CarrelloAdmin(admin.ModelAdmin):
    list_display = ("cliente", "prodotto", "quantita")
    list_filter = ("cliente",)
    search_fields = ("prodotto__nome_prodotto", "cliente__email")
