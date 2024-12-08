from django.urls import path
from .views import messaggio
from .views import SignUpView
from .forms import CustomAuthenticationForm
from django.contrib.auth import views
from .views import ProfiloView, UtenteDeleteView

urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path('', messaggio, name="contatti"),
    path('login/', views.LoginView.as_view(
            template_name="registration/login.html",
            authentication_form=CustomAuthenticationForm
            ),name='login'),
    path('profilo/', ProfiloView.as_view(), name="profilo" ),     
    path('profilo/<int:pk>/delete', UtenteDeleteView.as_view(), name="eliminaProfilo" )

]