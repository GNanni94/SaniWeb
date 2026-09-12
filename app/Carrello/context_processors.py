# Pagine dove il widget del carrello flottante non viene mostrato
PAGINE_ESCLUSE_CARRELLO_FLOTTANTE = {
    "carrello",
    "profilo",
    "eliminaProfilo",
    "password_change",
    "lista_ordini",
    "dashboard_admin",
    "gestione_avvisi",
    "dashboard_prodotti_senza_immagine",
    "gestione_documenti",
}


def carrello_ha_prodotti(request):
    """
    Espone a tutti i template il contenuto del carrello dell'utente loggato
    (elementi_carrello_utente, totale_elementi_carrello) e
    pagina_esclude_carrello_flottante.
    """
    url_name = request.resolver_match.url_name if request.resolver_match else None
    pagina_esclude_carrello_flottante = url_name in PAGINE_ESCLUSE_CARRELLO_FLOTTANTE
    if not request.user.is_authenticated:
        return {
            "elementi_carrello_utente": [],
            "totale_elementi_carrello": 0,
            "pagina_esclude_carrello_flottante": pagina_esclude_carrello_flottante,
        }
    elementi_carrello_utente = list(
        request.user.elementi_carrello.select_related("prodotto")
    )
    totale_elementi_carrello = sum(elemento.quantita for elemento in elementi_carrello_utente)
    return {
        "elementi_carrello_utente": elementi_carrello_utente,
        "totale_elementi_carrello": totale_elementi_carrello,
        "pagina_esclude_carrello_flottante": pagina_esclude_carrello_flottante,
    }
