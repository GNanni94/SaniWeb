from django.urls import path
from .views import PaginaCarrelloView
from . import views

urlpatterns = [
    path('',PaginaCarrelloView.as_view(), name="carrello" ),
    path('aggiungiProdotto/<int:prodottoId>/', views.aggiungi_prodotti_al_carrello, name='aggiungi_prodotti'),
    path('eliminaProdotto/<int:elemento_carrello_id>/',views.elimina_elementi_dal_carrello , name = "elimina_prodotti"),
    path('aumentaQuantita/<int:elemento_carrello_id>/', views.aumenta_quantita_carrello, name='aumenta_quantita'),
    path('diminuisciQuantita/<int:elemento_carrello_id>/', views.diminuisci_quantita_carrello, name='diminuisci_quantita'),
    path('settaggioQuantita/<int:elemento_carrello_id>/', views.settaggio_quantita, name='settaggio_quantita'),
    path('svuotaCarrello/', views.svuota_carrello, name='svuota_carrello')
]