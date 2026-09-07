// Tasti +/- quantita' e cestino nella lista prodotti della pagina carrello,
// gestiti via AJAX (fetch) sulla lista dentro "#colonnaListaCarrello". Il
// form "Richiedi preventivo" (#informazioni) resta un invio classico a
// pagina intera, non toccato da questo script.
(function () {
    var colonnaLista = document.getElementById('colonnaListaCarrello');
    var contatoreNumero = document.getElementById('contatoreArticoliNumero');
    if (!colonnaLista) {
        return;
    }

    function sostituisciLista(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        var nuovaLista = tmp.firstElementChild;
        var listaAttuale = document.getElementById('listaCarrelloItems');
        if (!nuovaLista || nuovaLista.id !== 'listaCarrelloItems' || !listaAttuale) {
            window.location.reload();
            return;
        }
        var totale = parseInt(nuovaLista.dataset.totaleArticoli, 10) || 0;
        if (totale === 0) {
            // Il carrello si e' svuotato: reload completo invece di
            // replicare via JS il cambio di layout
            window.location.reload();
            return;
        }
        // Idiomorph preserva i nodi <li> dei prodotti la cui quantita' non
        // e' cambiata, con fallback a replaceChild se la libreria non e' caricata
        if (window.Idiomorph) {
            Idiomorph.morph(listaAttuale, nuovaLista.outerHTML);
        } else {
            colonnaLista.replaceChild(nuovaLista, listaAttuale);
        }
        if (contatoreNumero) {
            contatoreNumero.textContent = totale;
        }
        // Forza un ricalcolo immediato di scroll/resize per il form
        // "Informazioni" (carrello-form-sticky.js), la cui altezza e'
        // appena cambiata
        window.dispatchEvent(new Event('resize'));
    }

    // Campo quantita': "change" (non "input") sottomette solo a valore
    // commesso, non ad ogni carattere digitato
    colonnaLista.addEventListener('change', function (event) {
        var campo = event.target;
        if (campo.matches && campo.matches('.carrello-stepper-qty-input')) {
            campo.form.requestSubmit();
        }
    });

    // Seleziona il valore attuale al focus, cosi' il nuovo numero lo sostituisce subito
    colonnaLista.addEventListener('focus', function (event) {
        var campo = event.target;
        if (campo.matches && campo.matches('.carrello-stepper-qty-input')) {
            campo.select();
        }
    }, true);

    // Delegazione sulla colonna: funziona anche sulle righe rigenerate dopo ogni sostituzione
    colonnaLista.addEventListener('submit', function (event) {
        var f = event.target;
        if (!f || f.tagName !== 'FORM') {
            return;
        }
        event.preventDefault();
        var corpo = new FormData(f);
        corpo.append('contesto', 'pagina_carrello');
        fetch(f.action, {
            method: 'POST',
            body: corpo,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (!response.ok) {
                    window.location.reload();
                    return;
                }
                sostituisciLista(html);
            });
        }).catch(function () {
            window.location.reload();
        });
    });
})();
