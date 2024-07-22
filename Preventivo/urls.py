from django.urls import path

from .views import PreventivoListView, PreventivoDetailView
from . import views

urlpatterns = [
    path('', PreventivoListView.as_view(), name="lista_ordini" ),
    path('new/', views.crea_ordine_da_carrello, name='crea_ordine'),
    path('dettaglio_preventivo/<int:pk>/', PreventivoDetailView.as_view(), name='dettaglio_ordine'),
]