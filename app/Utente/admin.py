from django.contrib import admin
from django.contrib.auth.admin import UserAdmin 
from .models import Cliente, Messaggi, Registrati
# Register your models here.

#admin.site.register(Registrati,  UserAdmin)

#admin.site.register(Cliente)
admin.site.register(Messaggi)


@admin.register(Registrati)
class RegistratiAdmin(admin.ModelAdmin): 
    list_display=[
        'email',
        'first_name',
        'codiceFiscale_PartitaIVA',
        'telefono'
    ]
    search_fields =['email', 'first_name', 'cognome_ragione_sociale']

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):     
    list_display=['nome', 'cognome_ragione_sociale', 'email', 'citta', 'indirizzo']
    search_fields = ['email', 'first_name', 'cognome_ragione_sociale']