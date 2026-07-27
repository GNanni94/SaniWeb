// Intercetta i click sui link "Aggiungi al preventivo" (prodotti_card.html,
// prodotti_tabella.html) ed esegue l'aggiunta al carrello in background
// (fetch), senza ricaricare la pagina: la vecchia navigazione con redirect
// riportava sempre la pagina a ricaricarsi e "saltare" (anche con l'ancora
// sul prodotto), risultando scomoda - con fetch la posizione di scroll non
// si muove affatto.
document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href*="/carrello/aggiungiProdotto/"]');
    if (!link) {
        return;
    }

    event.preventDefault();

    var originalHTML = link.innerHTML;
    if (link.dataset.aggiungiInCorso === 'true') {
        return;
    }
    link.dataset.aggiungiInCorso = 'true';

    // L'header "X-Requested-With" segnala alla view (vedi
    // "aggiungi_prodotti_al_carrello" in Carrello/views.py) che questa e' una
    // richiesta in background: se l'utente non e' loggato, la view risponde
    // con 401 invece di un redirect al login - un redirect verrebbe seguito
    // automaticamente da "fetch" fino alla pagina di login, risultando
    // comunque in una risposta 200 (indistinguibile da un'aggiunta riuscita)
    fetch(link.href, {
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(function (response) {
            if (response.status === 401) {
                // Utente non loggato: porta li' anche la navigazione vera
                // del browser (non solo la fetch in background, altrimenti
                // l'utente resta sulla pagina di prima senza capire perche'
                // non e' successo nulla)
                window.location.href = document.body.dataset.loginUrl;
                return;
            }
            if (!response.ok) {
                throw new Error('Errore aggiunta al carrello');
            }
            link.innerHTML = '<i class="bi bi-check-lg"></i> Aggiunto';
            setTimeout(function () {
                link.innerHTML = originalHTML;
                link.dataset.aggiungiInCorso = 'false';
            }, 1200);
        })
        .catch(function () {
            // Fallback: se la richiesta in background fallisce, si naviga
            // normalmente (redirect pieno, gestito lato server)
            window.location.href = link.href;
        });
});
