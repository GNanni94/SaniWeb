(function () {
    var wrapper = document.getElementById('ricercaProdottiWrapper');
    var form = document.getElementById('ricercaProdottiForm');
    var toggleBtn = document.getElementById('search-addon');
    var input = document.getElementById('prodottiCardSearch');
    if (!wrapper || !form || !toggleBtn || !input) {
        return;
    }

    // Allargamento progressivo del cerchio mentre la tastiera virtuale sale
    // e ancoraggio del wrapper fluttuante al viewport visivo: logica
    // condivisa in ricerca-tastiera-virtuale.js (caricato prima di questo
    // file), usata anche da controlli-ricerca-filtro-tabella.js.
    var wrapperFluttuante = document.getElementById('controlliRicercaFiltroWrapper');
    var gestoreTastiera = creaGestoreTastieraVirtuale({
        wrapper: wrapper,
        bottoneToggle: toggleBtn,
        wrapperFluttuante: wrapperFluttuante
    });

    // Sotto i 576px la lente ha un doppio ruolo, a seconda dello stato:
    // - campo chiuso: il click lo apre e ci mette il focus
    // - campo gia' aperto: il click invia la ricerca (la lente si comporta
    //   come il bottone "invia" di un search box classico)
    toggleBtn.addEventListener('click', function () {
        if (!wrapper.classList.contains('ricerca-espansa')) {
            gestoreTastiera.resetTastieraSalita();
            wrapper.classList.add('ricerca-espansa');
            toggleBtn.setAttribute('aria-expanded', 'true');
            // Focus subito, non piu' ritardato a transizione finita:
            // "preventScroll" toglie gia' da solo il motivo per cui prima si
            // aspettava (senza, il browser scrollava la pagina per portare
            // l'input sopra la tastiera mentre il cerchio stava ancora
            // animando la propria larghezza, risultato uno scroll instabile
            // percepito come un salto) - il focus immediato fa partire prima
            // la tastiera nativa, da cui dipendono gli eventi "resize" che
            // pilotano "applicaLarghezzaDaTastiera" (ricerca-tastiera-virtuale.js)
            input.focus({ preventScroll: true });
            return;
        }
        form.requestSubmit();
    });

    // Richiude il campo se si clicca fuori mentre e' vuoto, cosi' la lente
    // torna alla posizione chiusa senza dover cancellare a mano il testo.
    // "input.blur()" (non piu' la rimozione diretta di ".ricerca-espansa")
    // fa partire la chiusura nativa della tastiera: il resto si finalizza
    // dentro "applicaLarghezzaDaTastiera" quando la tastiera e' scesa del
    // tutto, cosi' il cerchio si restringe insieme a lei invece di sparire
    // di colpo. Se non c'era nessuna tastiera da chiudere (es. tastiera
    // fisica, o "visualViewport" non supportato) non arriverebbe pero'
    // nessun evento "resize" a finalizzare: si controlla quindi anche qui,
    // chiudendo subito se lo spazio occupato e' gia' zero
    document.addEventListener('click', function (event) {
        if (!wrapper.classList.contains('ricerca-espansa') || wrapper.contains(event.target)) {
            return;
        }
        if (input.value.trim() === '') {
            input.blur();
            if (gestoreTastiera.spazioOccupatoDallaTastiera() === 0) {
                wrapper.classList.remove('ricerca-espansa');
                toggleBtn.setAttribute('aria-expanded', 'false');
                wrapper.style.width = '';
            }
        }
    });

    // Bordo bianco (".su-sfondo-blu" in prodotti.css) quando il cerchio
    // fluttuante della ricerca finisce sopra uno sfondo blu navbar - logica
    // condivisa in sovrapposizione-sfondo-blu.js (caricato prima di questo
    // file in prodotti_card.html), stesso controllo usato dal carrello
    // flottante (carrello-flottante.js) e da dashboard-prodotti-immagini.js.
    // Le card sono su due colonne anche da telefono (griglia_prodotti.html,
    // "col-6"), quindi qui la sovrapposizione va controllata anche in
    // orizzontale (selettore dei footer di card passato qui sotto), non
    // solo verticale come per il footer di pagina (sempre a piena larghezza)
    var aggiornaBordoSuSfondoBlu = creaAggiornatoreSuSfondoBlu(function () {
        return wrapper;
    }, 'su-sfondo-blu', '.card.card-prodotto .card-footer-btn');

})();
