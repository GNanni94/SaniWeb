from django.urls import path, include
from django.views.generic import TemplateView
from .views import (
    DocumentoView,
    carica_immagine_prodotto,
    dashboard_admin,
    dashboard_prodotti_senza_immagine,
    elimina_categoria,
    elimina_documento,
    gestione_documenti,
    modifica_documento,
    nuovo_documento,
    rinomina_categoria,
)
from Utente import views, urls

urlpatterns = [
    path("", TemplateView.as_view(template_name="home.html"), name = "home"),
    path("home/", TemplateView.as_view(template_name="home.html"), name = "home"),
    path("Storia Azienda", TemplateView.as_view(template_name="storia_azienda.html"), name = "storia_azienda"),
    path("etichettaturaAmbientale",TemplateView.as_view(template_name="etichettatura_ambientale.html"), name = "etichettatura_ambientale"),
    path("Contatti", include("Utente.urls")),
    path("Documenti", DocumentoView.as_view(), name="documenti"),
    path("dashboard/", dashboard_admin, name="dashboard_admin"),
    path("dashboard/prodotti-senza-immagine/", dashboard_prodotti_senza_immagine, name="dashboard_prodotti_senza_immagine"),
    path("dashboard/prodotti-senza-immagine/<int:pk>/carica-immagine/", carica_immagine_prodotto, name="carica_immagine_prodotto"),
    path("dashboard/documenti/", gestione_documenti, name="gestione_documenti"),
    path("dashboard/documenti/nuovo/", nuovo_documento, name="nuovo_documento"),
    path("dashboard/documenti/<int:pk>/modifica/", modifica_documento, name="modifica_documento"),
    path("dashboard/documenti/<int:pk>/elimina/", elimina_documento, name="elimina_documento"),
    path("dashboard/documenti/categorie/<int:pk>/rinomina/", rinomina_categoria, name="rinomina_categoria"),
    path("dashboard/documenti/categorie/<int:pk>/elimina/", elimina_categoria, name="elimina_categoria"),
]