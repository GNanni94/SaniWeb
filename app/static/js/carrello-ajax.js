// Tasti +/- quantita' e cestino nella lista prodotti della pagina carrello:
// gestiti via AJAX (fetch), senza ricaricare la pagina intera - stesso
// pattern di gestione-avvisi.js (header X-Requested-With, il server
// risponde con un frammento HTML che sostituisce quello esistente,
// validato per id prima di essere iniettato). Il carrello flottante ha gia'
// il proprio script separato (carrello-flottante.js): questo file riguarda
// solo la lista dentro "#colonnaListaCarrello".
//
// Il form "Richiedi preventivo" (#informazioni, fuori da questa lista)
// resta volutamente un invio classico a pagina intera: non e' toccato da
// questo script, cosi' un +/- sul carrello non cancella mai una nota che
// l'utente sta scrivendo li' dentro.
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
            // Il carrello si e' svuotato: il layout cambia radicalmente
            // (messaggio "carrello vuoto", box "Informazioni" che sparisce) -
            // un reload completo e' piu' semplice e sicuro che replicare
            // quella transizione via JS
            window.location.reload();
            return;
        }
        colonnaLista.replaceChild(nuovaLista, listaAttuale);
        if (contatoreNumero) {
            contatoreNumero.textContent = totale;
        }
        // La colonna del form "Informazioni" (carrello-form-sticky.js) misura
        // le posizioni in base a scroll/resize: la lista ha appena cambiato
        // altezza, quindi le forza un ricalcolo immediato invece di aspettare
        // il prossimo scroll dell'utente
        window.dispatchEvent(new Event('resize'));
    }

    // Campo quantita' scrivibile da tastiera: "change" (non "input") per
    // sottomettere solo a valore commesso (blur dopo una modifica, o
    // frecce su/giu' del campo), non ad ogni carattere digitato. Il tasto
    // Invio dentro il campo sottomette gia' il form nativamente (unico
    // campo testuale del form), senza passare da qui - i due percorsi
    // convergono comunque sullo stesso listener "submit" qui sotto, nessun
    // doppio invio
    colonnaLista.addEventListener('change', function (event) {
        var campo = event.target;
        if (campo.matches && campo.matches('.carrello-stepper-qty-input')) {
            campo.form.requestSubmit();
        }
    });

    // Seleziona il valore attuale al focus: scrivere il nuovo numero lo
    // sostituisce subito, senza dover prima cancellare a mano quello vecchio
    colonnaLista.addEventListener('focus', function (event) {
        var campo = event.target;
        if (campo.matches && campo.matches('.carrello-stepper-qty-input')) {
            campo.select();
        }
    }, true);

    // Delegazione sulla colonna: funziona anche sulle righe rigenerate dopo
    // ogni sostituzione, senza dover ri-agganciare l'evento ogni volta
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
