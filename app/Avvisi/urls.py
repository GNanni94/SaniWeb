from django.urls import path

from .views import elimina_avviso, gestione_avvisi, modifica_avviso, nuovo_avviso

urlpatterns = [
    path("gestione/", gestione_avvisi, name="gestione_avvisi"),
    path("nuovo/", nuovo_avviso, name="nuovo_avviso"),
    path("<int:pk>/modifica/", modifica_avviso, name="modifica_avviso"),
    path("<int:pk>/elimina/", elimina_avviso, name="elimina_avviso"),
]
