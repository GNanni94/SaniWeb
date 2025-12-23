from django.urls import path, include
from django.views.generic import TemplateView 
from .views import DocumentoView
from Utente import views, urls

urlpatterns = [
    path("", TemplateView.as_view(template_name="home.html"), name = "home"),
    path("home/", TemplateView.as_view(template_name="home.html"), name = "home"),
    path("Storia Azienda", TemplateView.as_view(template_name="storia_azienda.html"), name = "storia_azienda"),
    path("etichettaturaAmbientale",TemplateView.as_view(template_name="etichettatura_ambientale.html"), name = "etichettatura_ambientale"),
    #path("Contatti", TemplateView.as_view(template_name="contatti.html"), name = "contatti"),
    path("Contatti", include("Utente.urls")),
    path("Documenti", DocumentoView.as_view(), name="documenti"),
    path("logoEmail", emplateView.as_view(template_name="logoEmail.html"), name="logoEmail"),

]