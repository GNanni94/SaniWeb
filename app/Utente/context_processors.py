from .forms import CustomAuthenticationForm


def form_login_popup(request):
    """
    Disponibile in tutti i template (registrato in settings.py): espone
    un'istanza vuota di CustomAuthenticationForm, usata dal modal di
    login incluso in base.html su ogni pagina - vedi
    partials/form_login.html e "Login in popup" nelle spec.
    """
    return {"form_login_popup": CustomAuthenticationForm()}
