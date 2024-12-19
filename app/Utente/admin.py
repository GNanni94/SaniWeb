from django.contrib import admin
from django.contrib.auth.admin import UserAdmin 
from .models import Cliente, Messaggi, Registrati
# Register your models here.

admin.site.register(Registrati,  UserAdmin)

admin.site.register(Cliente)
admin.site.register(Messaggi)