// Il form "Richiedi preventivo" segue lo scroll finche' scorri la lista
// prodotti, e si aggancia al fondo esatto dell'ultima card quando la
// raggiunge. Gestito a mano (non con "position: sticky" puro) perche' lo
// sgancio nativo di sticky dipende da quanto l'INTERA PAGINA puo' scorrere
// sotto la riga (es. l'altezza del footer), non solo dalla lista prodotti:
// con carrelli lunghi la pagina puo' non offrire abbastanza scroll perche'
// lo sgancio nativo avvenga, lasciando il form fermo a meta' altezza
// invece che allineato in fondo alla lista.
(function () {
    var BREAKPOINT_LG = 992; // stesso breakpoint "lg" di Bootstrap: sotto
                              // questa larghezza le colonne si impilano,
                              // niente comportamento "segue lo scroll"
    var RESPIRO = 16; // 1rem di respiro tra il fondo della riga titolo e la card

    var colonnaLista = document.getElementById('colonnaListaCarrello');
    var colonnaForm = document.getElementById('colonnaFormPreventivo');
    var card = document.getElementById('cardFormPreventivo');
    var rigaIntestazione = document.querySelector('.intestazione-carrello-sticky');
    if (!colonnaLista || !colonnaForm || !card) {
        return;
    }

    // Offset superiore della card fixed/absolute: non un valore fisso, ma
    // il fondo REALE della riga titolo "Richiedi Preventivo" qui sopra
    // (anche lei "position: sticky", sempre agganciata subito sotto la
    // navbar durante lo scroll - vedi ".intestazione-carrello-sticky" in
    // carrello.css). Un margine fisso ignorava che quella riga occupa
    // spazio proprio li': la card, ferma a "top" costante, ci scorreva
    // sotto (z-index piu' basso della riga, 1020) invece di restare
    // sempre visibile appena sotto di lei.
    function margineSuperiore() {
        if (!rigaIntestazione) {
            return RESPIRO;
        }
        return rigaIntestazione.getBoundingClientRect().bottom + RESPIRO;
    }

    function resetta() {
        card.style.position = '';
        card.style.top = '';
        card.style.left = '';
        card.style.width = '';
    }

    function aggiorna() {
        if (window.innerWidth < BREAKPOINT_LG) {
            colonnaForm.style.minHeight = '';
            resetta();
            return;
        }

        // Si riparte sempre dal flusso normale prima di misurare: se si
        // riusasse la posizione di un giro precedente (gia' fixed o
        // absolute), la misura del bordo sinistro/larghezza sarebbe
        // quella (sbagliata) dell'override precedente, non quella reale
        // della card. Il costo di un reflow in piu' per scroll e'
        // trascurabile per una pagina cosi' semplice.
        resetta();

        var rigaCard = card.getBoundingClientRect();
        var altezzaCard = rigaCard.height;
        var larghezzaCard = rigaCard.width;
        var colonnaFormRect = colonnaForm.getBoundingClientRect();
        // Bootstrap aggiunge un padding interno alla colonna (il gutter
        // della griglia): la card, nel flusso normale, sta rientrata
        // rispetto al bordo della colonna proprio di quel padding.
        // Va conservato anche quando la card passa a "absolute" (dove il
        // riferimento e' la colonna, non piu' il viewport), altrimenti
        // la card salterebbe al bordo esterno della colonna invece di
        // restare alla stessa distanza da sinistra che aveva sempre
        // avuto - e' esattamente quello che causava lo spostamento a
        // sinistra/allargamento visibile appena partiva lo scroll.
        var insetSinistro = rigaCard.left - colonnaFormRect.left;

        // La colonna del form mantiene sempre la stessa altezza minima,
        // anche quando la card ne esce (fixed/absolute): l'altezza totale
        // della pagina resta costante a prescindere dalla modalita' della
        // card, quindi la barra di scroll non appare/sparisce mai.
        colonnaForm.style.minHeight = altezzaCard + 'px';

        // Calcolato una sola volta per giro: dipende dalla riga titolo
        // qui sopra, che non cambia posizione durante il resto di questa
        // funzione.
        var margine = margineSuperiore();

        // Finche' l'inizio della colonna non e' ancora salito oltre il
        // margine superiore, non c'e' ancora nulla da agganciare: il form
        // resta nel normale flusso della pagina (gia' resettato sopra).
        if (colonnaFormRect.top >= margine) {
            return;
        }

        var fondoLista = colonnaLista.getBoundingClientRect().bottom;

        if (fondoLista - margine >= altezzaCard) {
            // C'e' ancora spazio sotto: il form segue lo scroll, restando
            // fermo a "margine" dall'alto della finestra (appena sotto la
            // riga titolo), alla stessa posizione orizzontale che aveva
            // nel flusso normale.
            card.style.position = 'fixed';
            card.style.top = margine + 'px';
            card.style.left = rigaCard.left + 'px';
            card.style.width = larghezzaCard + 'px';
            return;
        }

        var topAssoluto = fondoLista - altezzaCard - colonnaFormRect.top;
        if (topAssoluto < 0) {
            // La lista prodotti e' piu' corta del form stesso: agganciare
            // il fondo del form al fondo della lista lo spingerebbe sopra
            // il suo punto di partenza naturale, sovrapponendolo al
            // contenuto sopra la riga (es. il titolo "Carrello"). In
            // questo caso il form resta semplicemente nel flusso normale
            // (gia' resettato sopra), senza inseguire lo scroll.
            return;
        }

        // La lista prodotti finisce prima che ci sia spazio per tenere il
        // form fermo in alto: si aggancia al fondo esatto dell'ultima
        // card della lista, mantenendo lo stesso rientro da sinistra che
        // aveva nel flusso normale.
        card.style.position = 'absolute';
        card.style.top = topAssoluto + 'px';
        card.style.left = insetSinistro + 'px';
        card.style.width = larghezzaCard + 'px';
    }

    aggiorna();
    window.addEventListener('scroll', aggiorna, { passive: true });
    window.addEventListener('resize', aggiorna);
})();
