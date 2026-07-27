from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import render

from .models import AvvisoChiusura


@user_passes_test(lambda u: u.is_authenticated and u.is_staff, login_url='login')
def gestione_avvisi(request):
    avvisi = AvvisoChiusura.objects.all()
    return render(request, 'gestione_avvisi.html', {'avvisi': avvisi})
