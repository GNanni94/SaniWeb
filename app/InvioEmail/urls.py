from django.urls import path
from .views import emailPreventivo, emailMessaggio

urlpatterns = [
    path('emailPreventivo/', emailPreventivo, name='emailPreventivo'),
    path('emailMessaggio/', emailMessaggio, name='emailMessaggio')
]