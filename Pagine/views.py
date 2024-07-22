from typing import Any
from django.shortcuts import render
from django.views.generic import ListView
from .models import File, CategoriaFile

# Create your views here.

class DocumentoView(ListView):
    model = CategoriaFile
    template_name='documenti.html'


    def get_context_data(self):
        context = super().get_context_data()
        context['files'] = File.objects.all()
        return context   
    