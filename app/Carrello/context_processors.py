def carrello_ha_prodotti(request):
    """
    Disponibile in tutti i template (registrato in settings.py): espone lo
    stato del carrello dell'utente loggato - usato in base.html sia per
    decidere se mostrare il widget del carrello fluttuante, sia per
    renderizzarne subito il contenuto (elementi_carrello_utente,
    totale_elementi_carrello) al primo caricamento della pagina, senza
    bisogno di una richiesta in background (vedi
    partials/carrello_flottante.html).
    """
    if not request.user.is_authenticated:
        return {
            "carrello_ha_prodotti": False,
            "elementi_carrello_utente": [],
            "totale_elementi_carrello": 0,
        }
    elementi_carrello_utente = list(
        request.user.elementi_carrello.select_related("prodotto")
    )
    totale_elementi_carrello = sum(elemento.quantita for elemento in elementi_carrello_utente)
    return {
        "carrello_ha_prodotti": totale_elementi_carrello > 0,
        "elementi_carrello_utente": elementi_carrello_utente,
        "totale_elementi_carrello": totale_elementi_carrello,
    }
