from django.urls import path

from .views import (
    aggiorna_anno_avviso,
    elimina_avviso,
    gestione_avvisi,
    modifica_avviso,
    nuovo_avviso,
    salva_testi_pillola_orari,
    toggle_avviso,
)

urlpatterns = [
    path("gestione/", gestione_avvisi, name="gestione_avvisi"),
    path("nuovo/", nuovo_avviso, name="nuovo_avviso"),
    path("<int:pk>/modifica/", modifica_avviso, name="modifica_avviso"),
    path("<int:pk>/elimina/", elimina_avviso, name="elimina_avviso"),
    path("<int:pk>/toggle/", toggle_avviso, name="toggle_avviso"),
    path("<int:pk>/aggiorna-anno/", aggiorna_anno_avviso, name="aggiorna_anno_avviso"),
    path("testi-pillola-orari/", salva_testi_pillola_orari, name="salva_testi_pillola_orari"),
]
