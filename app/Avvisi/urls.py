from django.urls import path

from .views import gestione_avvisi

urlpatterns = [
    path("gestione/", gestione_avvisi, name="gestione_avvisi"),
]
