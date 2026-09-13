from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from .models import Preventivo, Elementi_Preventivo, Dettaglio_Preventivo


class DettaglioPreventivoInline(admin.StackedInline):
    model = Dettaglio_Preventivo
    min_num = 1
    can_delete = False


class ElementiPreventivoInline(admin.TabularInline):
    model = Elementi_Preventivo
    extra = 1


@admin.register(Preventivo)
class PreventivoAdmin(admin.ModelAdmin):
    list_display = ("pk", "cliente_link", "data")
    list_select_related = ("cliente",)
    list_filter = (("cliente", admin.RelatedOnlyFieldListFilter), "data")
    inlines = [DettaglioPreventivoInline, ElementiPreventivoInline]

    @admin.display(description="Cliente", ordering="cliente")
    def cliente_link(self, obj):
        url = reverse("admin:Utente_registrati_change", args=[obj.cliente_id])
        return format_html('<a href="{}">{}</a>', url, obj.cliente)


@admin.register(Dettaglio_Preventivo)
class DettaglioPreventivoAdmin(admin.ModelAdmin):
    list_display = ("pk", "preventivo", "stato", "luogo")

    def has_delete_permission(self, request, obj=None):
        # Blocca solo l'eliminazione diretta dalla pagina di questo modello:
        # non quella innescata dalla cascata quando si elimina il Preventivo
        url_name = getattr(request.resolver_match, 'url_name', '') or ''
        prefix = f"{self.model._meta.app_label}_{self.model._meta.model_name}"
        if url_name.startswith(prefix):
            return False
        return super().has_delete_permission(request, obj)
    list_select_related = ("preventivo", "preventivo__cliente")
    list_filter = ("stato", ("preventivo__cliente", admin.RelatedOnlyFieldListFilter))
    search_fields = ("preventivo__cliente__username", "preventivo__cliente__email", "luogo")


@admin.register(Elementi_Preventivo)
class ElementiPreventivoAdmin(admin.ModelAdmin):
    list_display = ("pk", "preventivo_link", "prodotto_link", "quantita")
    list_select_related = ("preventivo", "preventivo__cliente", "prodotto")
    list_filter = (("preventivo", admin.RelatedOnlyFieldListFilter),)
    search_fields = ("prodotto__codice_prodotto", "prodotto__nome_prodotto", "preventivo__cliente__username", "preventivo__cliente__email")

    @admin.display(description="Preventivo", ordering="preventivo")
    def preventivo_link(self, obj):
        url = reverse("admin:Preventivo_preventivo_change", args=[obj.preventivo_id])
        return format_html('<a href="{}">{}</a>', url, obj.preventivo)

    @admin.display(description="Prodotto", ordering="prodotto")
    def prodotto_link(self, obj):
        url = reverse("admin:Prodotti_prodotto_change", args=[obj.prodotto_id])
        return format_html('<a href="{}">{}</a>', url, obj.prodotto)
