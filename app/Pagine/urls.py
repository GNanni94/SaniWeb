from django.urls import path, include
from django.views.generic import TemplateView
from .views import DocumentoView, carica_immagine_prodotto, dashboard_admin, dashboard_prodotti_senza_immagine
from Utente import views, urls

urlpatterns = [
    path("", TemplateView.as_view(template_name="home.html"), name = "home"),
    path("home/", TemplateView.as_view(template_name="home.html"), name = "home"),
    path("Storia Azienda", TemplateView.as_view(template_name="storia_azienda.html"), name = "storia_azienda"),
    path("etichettaturaAmbientale",TemplateView.as_view(template_name="etichettatura_ambientale.html"), name = "etichettatura_ambientale"),
    #path("Contatti", TemplateView.as_view(template_name="contatti.html"), name = "contatti"),
    path("Contatti", include("Utente.urls")),
    path("Documenti", DocumentoView.as_view(), name="documenti"),
    path("logoEmail", TemplateView.as_view(template_name="logoEmail.html"), name="logoEmail"),
    path("dashboard/", dashboard_admin, name="dashboard_admin"),
    path("dashboard/prodotti-senza-immagine/", dashboard_prodotti_senza_immagine, name="dashboard_prodotti_senza_immagine"),
    path("dashboard/prodotti-senza-immagine/<int:pk>/carica-immagine/", carica_immagine_prodotto, name="carica_immagine_prodotto"),

]