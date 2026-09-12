# Pagine dove il widget del carrello flottante non ha senso: checkout gia'
# in corso, sezione profilo/preventivi dell'utente e le sue pagine figlie,
# e l'intero albero staff-only sotto dashboard_admin (nessuna di queste
# riguarda lo shopping dell'utente che le visita)
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
    Disponibile in tutti i template (registrato in settings.py): espone lo
    stato del carrello dell'utente loggato - usato in base.html sia per
    decidere se mostrare il widget del carrello fluttuante, sia per
    renderizzarne subito il contenuto (elementi_carrello_utente,
    totale_elementi_carrello) al primo caricamento della pagina, senza
    bisogno di una richiesta in background (vedi
    partials/carrello_flottante.html). Espone anche
    "pagina_esclude_carrello_flottante", usato in base.html per non
    caricare ne' il markup ne' lo script del widget sulle pagine dove non
    ha senso mostrarlo.
    """
    url_name = request.resolver_match.url_name if request.resolver_match else None
    pagina_esclude_carrello_flottante = url_name in PAGINE_ESCLUSE_CARRELLO_FLOTTANTE
    if not request.user.is_authenticated:
        return {
            "carrello_ha_prodotti": False,
            "elementi_carrello_utente": [],
            "totale_elementi_carrello": 0,
            "pagina_esclude_carrello_flottante": pagina_esclude_carrello_flottante,
        }
    elementi_carrello_utente = list(
        request.user.elementi_carrello.select_related("prodotto")
    )
    totale_elementi_carrello = sum(elemento.quantita for elemento in elementi_carrello_utente)
    return {
        "carrello_ha_prodotti": totale_elementi_carrello > 0,
        "elementi_carrello_utente": elementi_carrello_utente,
        "totale_elementi_carrello": totale_elementi_carrello,
        "pagina_esclude_carrello_flottante": pagina_esclude_carrello_flottante,
    }
