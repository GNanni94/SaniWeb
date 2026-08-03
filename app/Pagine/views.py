from functools import wraps
from typing import Any

from django.contrib.auth.views import redirect_to_login
from django.db.models import Q
from django.shortcuts import redirect, render
from django.views.generic import ListView

from Prodotti.models import DEFAULT_IMMAGINE_ARTICOLO, Prodotto
from .models import File, CategoriaFile

# Create your views here.

class DocumentoView(ListView):
    model = CategoriaFile
    template_name='documenti.html'


    def get_context_data(self):
        context = super().get_context_data()
        context['files'] = File.objects.all()
        return context


def dashboard_richiesto(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        if not request.user.is_staff:
            return redirect('home')
        return view_func(request, *args, **kwargs)
    return wrapper


@dashboard_richiesto
def dashboard_prodotti_senza_immagine(request):
    prodotti = Prodotto.objects.filter(
        Q(immagine_rel__isnull=True) | Q(immagine_rel__immagine=DEFAULT_IMMAGINE_ARTICOLO)
    ).order_by('codice_prodotto')
    return render(request, 'dashboard_prodotti_senza_immagine.html', {'prodotti': prodotti})
