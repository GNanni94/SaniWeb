from django.urls import path
from .views import CatalogoView, CatalogoListView, ProdottoListView, SottocategoriaListView, sincronizzazione

#from .views import dettaglio_categoria

urlpatterns = [
    path("", CatalogoView.as_view(), name = "catalogo"),
    path('<int:pk>/', CatalogoListView.as_view(), name="dettaglio_categoria"),  
    path('<int:pk_categoria>/<int:pk_sottocategoria>/', SottocategoriaListView.as_view(), name="dettaglio_sottocategoria"),  
    path("<int:pk>/search/", ProdottoListView.as_view(), name="search_prodotto"),
    path("api/sincronizzazione", sincronizzazione, name="sincronizzazione" )
    
]