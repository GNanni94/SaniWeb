"""SitoWeb URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    path("", include("Pagine.urls")),
    path("catalogo/", include("Prodotti.urls")),
    # "clienti/" (django.contrib.auth.urls) va incluso PRIMA di "cliente/"
    # (Utente.urls): quest'ultimo ridefinisce alcuni nomi di route gia'
    # usati da auth.urls (es. "login", "password_reset") con viste/form
    # personalizzati del progetto - a parita' di nome, reverse()/{% url %}
    # usa l'ultima route registrata in urlpatterns, quindi l'include di
    # Utente.urls deve stare dopo per vincere lui, non quello generico
    path("clienti/", include("django.contrib.auth.urls")),
    path("cliente/", include("Utente.urls")),
    path("carrello/", include("Carrello.urls")),
    path("preventivo/", include("Preventivo.urls")),

]+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
