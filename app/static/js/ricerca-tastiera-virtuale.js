// Logica condivisa tra controlli-ricerca-filtro-card.js (prodotti_card.html)
// e controlli-ricerca-filtro-tabella.js (prodotti_tabella.html): il cerchio
// di ricerca a comparsa si allarga progressivamente mentre la tastiera
// virtuale sale (invece di un singolo scatto), si richiude da solo quando
// la tastiera scende del tutto, e il wrapper fluttuante che lo contiene
// resta ancorato al viewport VISIVO (non a quello di layout) mentre la
// tastiera e' aperta - senza, un elemento "position: fixed" rischierebbe di
// finire nascosto sotto la tastiera invece di restare appena sopra.
// Caricare questo file PRIMA di ciascuno dei due sopra.
//
// "opzioni":
// - wrapper: il cerchio di ricerca (riceve ".ricerca-espansa"/style.width)
// - bottoneToggle: il bottone lente (riceve aria-expanded quando la
//   tastiera lo richiude da sola)
// - wrapperFluttuante (opzionale): il contenitore esterno "position: fixed"
//   da ancorare al viewport visivo - se assente (o "visualViewport" non
//   supportato, browser molto vecchi) questa parte viene semplicemente
//   saltata
//
// Ritorna { spazioOccupatoDallaTastiera, applicaLarghezzaDaTastiera,
// resetTastieraSalita } - le prime due servono anche ai gestori di
// apertura/chiusura al click definiti nel file chiamante (fuori da qui,
// perche' il comportamento del click stesso differisce leggermente tra le
// due pagine - submit di un form vs nessuna azione aggiuntiva), la terza va
// chiamata li' ad ogni apertura del campo
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

    // 56px/192px = 3.5rem/12rem, stessi valori di ".ricerca-espansa"/della
    // larghezza chiusa in prodotti.css: se cambiano li', vanno cambiati
    // anche qui. "ALTEZZA_TASTIERA_RIFERIMENTO" e' una stima (tastiere reali
    // vanno all'incirca dai 250 ai 380px): oltre quella soglia il cerchio e'
    // gia' alla larghezza piena, anche se la tastiera continua a salire
    var LARGHEZZA_CHIUSA = 56;
    var LARGHEZZA_APERTA = 192;
    var ALTEZZA_TASTIERA_RIFERIMENTO = 300;

    // "document.activeElement" non basta a riconoscere una chiusura: su
    // Android il gesto/tasto "indietro" chiude la tastiera senza togliere
    // il focus dal campo (resta "a fuoco" agli occhi del browser, solo la
    // tastiera a schermo sparisce). Si traccia invece se la tastiera e'
    // DAVVERO salita almeno una volta da quando si e' aperto il campo
    // (azzerata dal chiamante ad ogni apertura, tramite
    // "resetTastieraSalita"): quando poi lo spazio torna a zero, la
    // chiusura si finalizza a prescindere da cosa l'abbia causata (blur
    // esplicito, gesto indietro, tasto indietro, ecc.)
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
            wrapper.style.width = ''; // torna al valore di default (3.5rem) di prodotti.css
        }
    }

    if (window.visualViewport && wrapperFluttuante) {
        // "transform: translateY()" (non "bottom"): un cambio di "bottom"
        // forza un ricalcolo del layout ad ogni chiamata, un "transform" lo
        // gestisce il compositor da solo - differenza che si sente proprio
        // durante lo scroll (si aggiorna un frame alla volta)
        function applicaSpostamento() {
            wrapperFluttuante.style.transform = 'translateY(-' + spazioOccupatoDallaTastiera() + 'px)';
        }

        // Apertura/chiusura della tastiera ("resize" di "visualViewport"):
        // iOS non manda un evento "tastiera finita di aprire/chiudere",
        // durante l'animazione arrivano molti eventi ravvicinati con valori
        // intermedi. Si aspetta quindi un momento di quiete (120ms, piu' di
        // un singolo fotogramma) prima di applicare lo spostamento finale,
        // lasciando la transizione CSS (".wrapperFluttuante", "transform
        // .25s ease" in prodotti.css) animare quell'unico scatto
        var timerStabilizzazione = null;
        function pianificaSuResize() {
            clearTimeout(timerStabilizzazione);
            timerStabilizzazione = setTimeout(applicaSpostamento, 120);
        }

        // Scroll a tastiera gia' aperta: qui serve l'opposto, un aggancio
        // in tempo reale frame per frame, senza aspettare ne' transizione
        // morbida - con quelle il bottone "insegue" restando visibilmente
        // staccato dalla tastiera durante il gesto. ".spostamento-istantaneo"
        // (prodotti.css) azzera la transizione finche' arrivano eventi di
        // scroll, tolta con lo stesso timer di quiete di sopra una volta
        // fermo (cosi' un eventuale ulteriore aggiustamento torna morbido)
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
            // larghezza: NON debounced apposta, ad ogni evento - qui si
            // vuole seguire la salita/discesa della tastiera passo passo,
            // non aspettare che si fermi per applicare un unico valore finale
            applicaLarghezzaDaTastiera();
        });
        // "visualViewport.scroll" da solo non basta: durante uno scroll
        // normale del contenuto (non un pinch-zoom) arriva piu' di rado di
        // quanto servirebbe per restare visivamente agganciati, risultando
        // nel bottone che "insegue" lo scroll invece di seguirlo subito.
        // "window.scroll" (il normale evento di scroll della pagina) da'
        // molte piu' occasioni di correggere la posizione durante il gesto -
        // "suScroll" e' gia' protetta da "aggiornamentoScrollPianificato"
        // (un solo aggiornamento per frame), quindi ascoltarla da entrambe
        // le fonti non duplica lavoro
        window.visualViewport.addEventListener('scroll', suScroll);
        window.addEventListener('scroll', suScroll, { passive: true });
    }

    return {
        spazioOccupatoDallaTastiera: spazioOccupatoDallaTastiera,
        applicaLarghezzaDaTastiera: applicaLarghezzaDaTastiera,
        resetTastieraSalita: resetTastieraSalita
    };
}
