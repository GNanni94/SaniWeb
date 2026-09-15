from .forms import CustomAuthenticationForm, CustomPasswordChangeForm


def form_login_popup(request):
    """
    Disponibile in tutti i template (registrato in settings.py): espone
    un'istanza vuota di CustomAuthenticationForm, usata dal modal di
    login incluso in base.html su ogni pagina - vedi
    partials/form_login.html e "Login in popup" nelle spec.
    """
    return {"form_login_popup": CustomAuthenticationForm()}


def form_password_change_popup(request):
    """
    Disponibile in tutti i template (registrato in settings.py): espone
    un'istanza vuota di CustomPasswordChangeForm per l'utente autenticato,
    usata dal modal di cambio password incluso in base.html - vedi
    partials/form_cambio_password.html.
    """
    if not request.user.is_authenticated:
        return {}
    return {"form_password_change_popup": CustomPasswordChangeForm(request.user)}
