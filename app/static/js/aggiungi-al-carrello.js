// Intercetta in fase di capture i click sui link "Aggiungi al preventivo"
// ed esegue l'aggiunta al carrello in background via fetch, senza
// ricaricare la pagina
document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href*="/carrello/aggiungiProdotto/"]');
    if (!link) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    eseguiAggiuntaAlCarrello(link);
}, true);

function eseguiAggiuntaAlCarrello(link) {
    var originalHTML = link.innerHTML;
    if (link.dataset.aggiungiInCorso === 'true') {
        return;
    }
    link.dataset.aggiungiInCorso = 'true';

    // L'header "X-Requested-With" segnala alla view che la richiesta e' in
    // background: se l'utente non e' loggato, risponde con 401 invece di un
    // redirect al login
    fetch(link.href, {
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(function (response) {
            if (response.status === 401) {
                // Resetta il flag prima di aprire il popup di login
                link.dataset.aggiungiInCorso = 'false';
                if (window.mostraModalLogin) {
                    // Ripete l'aggiunta al carrello dopo un login riuscito
                    window.mostraModalLogin(function () {
                        eseguiAggiuntaAlCarrello(link);
                    });
                } else {
                    // Fallback al reindirizzamento classico se il modal di login non e' disponibile
                    var next = window.location.pathname + window.location.search;
                    window.location.href = document.body.dataset.loginUrl + '?next=' + encodeURIComponent(next);
                }
                return;
            }
            if (!response.ok) {
                throw new Error('Errore aggiunta al carrello');
            }
            return response.text().then(function (html) {
                // Il corpo della risposta e' il widget del carrello flottante gia' aggiornato
                if (window.aggiornaCarrelloFlottante) {
                    window.aggiornaCarrelloFlottante(html);
                }
                link.innerHTML = '<i class="bi bi-check-lg"></i> Aggiunto';
                setTimeout(function () {
                    link.innerHTML = originalHTML;
                    link.dataset.aggiungiInCorso = 'false';
                }, 1200);
            });
        })
        .catch(function () {
            // Ricarica la pagina per mostrare lo stato reale del carrello
            window.location.reload();
        });
}
