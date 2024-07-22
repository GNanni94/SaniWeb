from django.contrib import admin
from .models import Preventivo, Elementi_Preventivo, Dettaglio_Preventivo
# Register your models here.

admin.site.register(Elementi_Preventivo)
admin.site.register(Preventivo)
admin.site.register(Dettaglio_Preventivo)
