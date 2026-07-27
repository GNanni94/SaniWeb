from django.contrib import admin

from .models import AvvisoChiusura


@admin.register(AvvisoChiusura)
class AvvisoChiusuraAdmin(admin.ModelAdmin):
    list_display = ("data_inizio", "data_fine", "motivo_chiusura", "attivo")
    list_editable = ("attivo",)
