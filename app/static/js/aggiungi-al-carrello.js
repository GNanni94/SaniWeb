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
                // non e' successo nulla). "next" riporta l'utente sulla
                // pagina di provenienza dopo il login, invece che sempre
                // alla home (LOGIN_REDIRECT_URL di default)
                //
                // Il flag va resettato PRIMA di navigare via: se l'utente
                // torna indietro col tasto "indietro" del browser, la pagina
                // viene spesso ripristinata dalla bfcache con lo stesso DOM
                // di quando e' uscito, "aggiungiInCorso" incluso - senza
                // questo reset il link resterebbe bloccato per sempre e un
                // riclick non farebbe piu' nulla (ne' fetch ne' redirect)
                link.dataset.aggiungiInCorso = 'false';
                var next = window.location.pathname + window.location.search;
                window.location.href = document.body.dataset.loginUrl + '?next=' + encodeURIComponent(next);
                return;
            }
            if (!response.ok) {
                throw new Error('Errore aggiunta al carrello');
            }
            return response.text().then(function (html) {
                // Il corpo della risposta e' ora il widget del carrello
                // fluttuante gia' aggiornato (vedi
                // "aggiungi_prodotti_al_carrello" in Carrello/views.py):
                // lo si passa a carrello-flottante.js, che sostituisce il
                // contenitore - stesso identico meccanismo usato quando
                // l'azione parte dal pannello stesso
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
            // Non si puo' distinguere in modo affidabile, da una fetch
            // fallita, se la richiesta non e' mai arrivata al server oppure
            // se e' arrivata e ha gia' aggiunto il prodotto ma solo la
            // risposta si e' persa (connessione caduta, timeout): ri-
            // navigare sullo stesso link (che aggiunge di nuovo il
            // prodotto, essendo una GET senza @require_POST) rischierebbe
            // di raddoppiare la quantita' in quest'ultimo caso. Un reload
            // mostra invece lo stato reale del carrello qualunque esso sia
            // - stesso principio gia' usato per gli errori imprevisti in
            // gestione-avvisi.js/gestione-documenti.js
            window.location.reload();
        });
});
