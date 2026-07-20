from django.urls import path
from .views import messaggio
from .views import SignUpView
from .forms import CustomAuthenticationForm, CustomPasswordResetForm
from django.contrib.auth import views
from .views import ProfiloView, UtenteDeleteView, Profilo

urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path('', messaggio, name="contatti"),
    path('login/', views.LoginView.as_view(
            template_name="registration/login.html",
            authentication_form=CustomAuthenticationForm
            ),name='login'),
    # Sovrascrive la route "password_reset" generica di django.contrib.auth.urls
    # (inclusa in SitoWeb/urls.py sotto "clienti/"): essendo Utente.urls
    # registrato prima nell'urlconf, {% url 'password_reset' %} risolve a
    # questa - stesso pattern gia' usato sopra per "login"
    path('password_reset/', views.PasswordResetView.as_view(
            form_class=CustomPasswordResetForm
            ), name='password_reset'),
    path('profilo/', ProfiloView.as_view(), name="profilo" ),     
    path('profilo/<int:pk>/delete', UtenteDeleteView.as_view(), name="eliminaProfilo" ),
    path('profilo/<int:pk>/update', Profilo.as_view(), name="profilo" )

]