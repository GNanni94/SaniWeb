// Allarga progressivamente il cerchio di ricerca mentre la tastiera virtuale
// sale, lo richiude quando la tastiera scende del tutto, e ancora il
// wrapper fluttuante che lo contiene al viewport visivo mentre la tastiera
// e' aperta. Condiviso tra controlli-ricerca-filtro-card.js e
// controlli-ricerca-filtro-tabella.js, va caricato prima di entrambi.
//
// "opzioni":
// - wrapper: il cerchio di ricerca (riceve ".ricerca-espansa"/style.width)
// - bottoneToggle: il bottone lente (riceve aria-expanded quando la
//   tastiera lo richiude da sola)
// - wrapperFluttuante (opzionale): il contenitore esterno "position: fixed"
//   da ancorare al viewport visivo, saltato se assente o se
//   "visualViewport" non e' supportato
//
// Ritorna { spazioOccupatoDallaTastiera, applicaLarghezzaDaTastiera,
// resetTastieraSalita }
function creaGestoreTastieraVirtuale(opzioni) {
    var wrapper = opzioni.wrapper;
    var bottoneToggle = opzioni.bottoneToggle;
    var wrapperFluttuante = opzioni.wrapperFluttuante;

    function spazioOccupatoDallaTastiera() {
        if (!window.visualViewport) {
            return 0;
        }
        var vv = window.visualViewport;
        return Math.max(window.innerHeight - vv.height - vv.offsetTop, 0);
    }

    // 56px/192px = 3.5rem/12rem, larghezza chiusa/espansa del cerchio (vedi
    // ".ricerca-espansa" in prodotti.css). ALTEZZA_TASTIERA_RIFERIMENTO e'
    // la soglia oltre cui il cerchio raggiunge la larghezza piena
    var LARGHEZZA_CHIUSA = 56;
    var LARGHEZZA_APERTA = 192;
    var ALTEZZA_TASTIERA_RIFERIMENTO = 300;

    // Traccia se la tastiera e' salita almeno una volta da quando il campo
    // si e' aperto (azzerato dal chiamante tramite resetTastieraSalita):
    // quando lo spazio torna a zero, la chiusura si considera completata
    var tastieraSalitaAlmenoUnaVolta = false;

    function resetTastieraSalita() {
        tastieraSalitaAlmenoUnaVolta = false;
    }

    function applicaLarghezzaDaTastiera() {
        if (!wrapper.classList.contains('ricerca-espansa')) {
            return;
        }
        var spazio = spazioOccupatoDallaTastiera();
        if (spazio > 0) {
            tastieraSalitaAlmenoUnaVolta = true;
        }
        var progresso = Math.min(spazio / ALTEZZA_TASTIERA_RIFERIMENTO, 1);
        wrapper.style.width = (LARGHEZZA_CHIUSA + progresso * (LARGHEZZA_APERTA - LARGHEZZA_CHIUSA)) + 'px';
        if (tastieraSalitaAlmenoUnaVolta && spazio === 0) {
            tastieraSalitaAlmenoUnaVolta = false;
            wrapper.classList.remove('ricerca-espansa');
            bottoneToggle.setAttribute('aria-expanded', 'false');
            wrapper.style.width = ''; // torna alla larghezza di default definita in prodotti.css
        }
    }

    if (window.visualViewport && wrapperFluttuante) {
        // Sposta il wrapper con transform: translateY() in base allo spazio occupato dalla tastiera
        function applicaSpostamento() {
            wrapperFluttuante.style.transform = 'translateY(-' + spazioOccupatoDallaTastiera() + 'px)';
        }

        // Aspetta 120ms di quiete sugli eventi "resize" di visualViewport prima di
        // applicare lo spostamento finale, lasciando la transizione CSS animare lo scatto
        var timerStabilizzazione = null;
        function pianificaSuResize() {
            clearTimeout(timerStabilizzazione);
            timerStabilizzazione = setTimeout(applicaSpostamento, 120);
        }

        // Durante lo scroll aggiorna la posizione ad ogni frame, senza transizione
        // (classe .spostamento-istantaneo in prodotti.css), rimossa dopo 120ms di quiete
        var aggiornamentoScrollPianificato = false;
        var timerFineScroll = null;
        function suScroll() {
            wrapperFluttuante.classList.add('spostamento-istantaneo');
            clearTimeout(timerFineScroll);
            timerFineScroll = setTimeout(function () {
                wrapperFluttuante.classList.remove('spostamento-istantaneo');
            }, 120);

            if (aggiornamentoScrollPianificato) {
                return;
            }
            aggiornamentoScrollPianificato = true;
            requestAnimationFrame(function () {
                aggiornamentoScrollPianificato = false;
                applicaSpostamento();
            });
        }

        applicaSpostamento(); // posizione iniziale, nessuna tastiera aperta
        window.visualViewport.addEventListener('resize', function () {
            pianificaSuResize(); // posizione: debounced, uno scatto solo a tastiera stabile
            applicaLarghezzaDaTastiera(); // larghezza: aggiornata ad ogni evento, segue la tastiera passo passo
        });
        // Ascolta sia visualViewport.scroll che window.scroll per aggiornare la
        // posizione durante lo scroll del contenuto; suScroll e' gia' protetta da
        // aggiornamentoScrollPianificato, quindi un solo aggiornamento per frame
        window.visualViewport.addEventListener('scroll', suScroll);
        window.addEventListener('scroll', suScroll, { passive: true });
    }

    return {
        spazioOccupatoDallaTastiera: spazioOccupatoDallaTastiera,
        applicaLarghezzaDaTastiera: applicaLarghezzaDaTastiera,
        resetTastieraSalita: resetTastieraSalita
    };
}
