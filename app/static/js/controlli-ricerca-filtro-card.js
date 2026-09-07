(function () {
    var wrapper = document.getElementById('ricercaProdottiWrapper');
    var form = document.getElementById('ricercaProdottiForm');
    var toggleBtn = document.getElementById('search-addon');
    var input = document.getElementById('prodottiCardSearch');
    if (!wrapper || !form || !toggleBtn || !input) {
        return;
    }

    // Allarga il cerchio e ancora il wrapper fluttuante al viewport visivo mentre la tastiera virtuale sale
    var wrapperFluttuante = document.getElementById('controlliRicercaFiltroWrapper');
    var gestoreTastiera = creaGestoreTastieraVirtuale({
        wrapper: wrapper,
        bottoneToggle: toggleBtn,
        wrapperFluttuante: wrapperFluttuante
    });

    // Sotto i 576px: click apre il campo (e ci mette il focus) se chiuso, invia la ricerca se gia' aperto
    toggleBtn.addEventListener('click', function () {
        if (!wrapper.classList.contains('ricerca-espansa')) {
            gestoreTastiera.resetTastieraSalita();
            wrapper.classList.add('ricerca-espansa');
            toggleBtn.setAttribute('aria-expanded', 'true');
            input.focus({ preventScroll: true });
            return;
        }
        form.requestSubmit();
    });

    // Chiude il campo se si clicca fuori mentre e' vuoto
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

    // Bordo bianco quando il cerchio di ricerca finisce sopra uno sfondo blu (footer di pagina o di card)
    var aggiornaBordoSuSfondoBlu = creaAggiornatoreSuSfondoBlu(function () {
        return wrapper;
    }, 'su-sfondo-blu', '.card.card-prodotto .card-footer-btn');
})();
