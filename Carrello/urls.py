from django.urls import path
from .views import CarrelloListView
from . import views

urlpatterns = [
    path('',CarrelloListView.as_view(), name="carrello" ),
    path('aggiungiProdotto/<int:prodottoId>/', views.aggiungi_prodotti_al_carrello, name='aggiungi_prodotti'),
    path('eliminaProdotto/<int:carrelloId>/',views.elimina_elementi_dal_carrello , name = "elimina_prodotti"),
    path('aumentaQuantita/<int:carrelloId>/', views.aumenta_quantita_carrello, name='aumenta_quantita'),
    path('diminuisciQuantita/<int:carrelloId>/', views.diminuisci_quantita_carrello, name='diminuisci_quantita'),
    path('settaggioQuantita/<int:carrelloId>/', views.settaggio_quantita, name='settaggio_quantita'),
]