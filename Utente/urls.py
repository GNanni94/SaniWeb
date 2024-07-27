from django.urls import path
from .views import messaggio
from .views import SignUpView
from .forms import CustomAuthenticationForm
from django.contrib.auth import views

urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path('', messaggio, name="contatti"),
    path('login/', views.LoginView.as_view(
            template_name="registration/login.html",
            authentication_form=CustomAuthenticationForm
            ),name='login'),
    path('logout/', views.LogoutView.as_view(),name='logout')
]