def carrello_ha_prodotti(request):
    """
    Disponibile in tutti i template (registrato in settings.py): dice se
    l'utente loggato ha almeno un prodotto nel carrello - usato in
    base.html per mostrare/nascondere il bottone "Preventivo" della navbar.
    """
    if not request.user.is_authenticated:
        return {"carrello_ha_prodotti": False}
    return {"carrello_ha_prodotti": request.user.elementi_carrello.exists()}
