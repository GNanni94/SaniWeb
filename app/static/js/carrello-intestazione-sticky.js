// Riga titolo "Richiedi Preventivo" (carrello.html) inglobata nella
// pillola della navbar durante lo scroll da telefono: stessa animazione di
// prodotti_card.html/prodotti_tabella.html
// (static/js/intestazione-categoria-sticky.js, ".intestazione-categoria-sticky"
// in prodotti.css), riscritta qui per il markup di questa pagina (bottone
// "Torna al catalogo", h1, contatore articoli - non
// indietro/titolo-categoria/filtro) invece di generalizzare quello script -
// stesso principio di scelta gia' seguito altrove nel progetto (classi CSS
// scoped e duplicate invece di un'unica astrazione condivisa, es.
// ".pillola-torna-preventivi" in preventivo.css che ripete i valori di
// ".btn-torna-catalogo" invece di riusarla).
//
// Riusa pero' DAVVERO (nessuna duplicazione) gli stessi tre slot vuoti
// della pillola (base.html, "#pillolaSlotIndietro/Titolo/Filtro") e la
// stessa classe di stato ".navbar-pillola-brand.pillola-modalita-categoria"
// (navbar.css): sono gia' pensati per essere generici e riusabili da
// qualunque pagina nonostante il nome storico "categoria" - vedi
// Docs/superpowers/specs/2026-08-30-pillola-titolo-categoria-scroll-design.md,
// sezione "Struttura: nuovi slot vuoti nella pillola".
//
// Differenza principale rispetto allo script originale: li' viene spostato
// solo il link del titolo (#titoloCategoriaLink), lasciando l'<h1>
// (nascosto via CSS) al suo posto per via del contenitore
// ".controlli-categoria-wrapper" che deve continuare a renderizzare (contiene
// un bottone "position: fixed"). Qui non c'e' nessun elemento fisso dentro
// la riga: si sposta l'<h1> per intero, la riga risulta quindi
// completamente vuota da agganciata (nessun bisogno di nascondere altro).
(function () {
    var sentinella = document.getElementById('sentinellaIntestazioneCarrello');
    var riga = document.querySelector('.intestazione-carrello-sticky');
    var navbar = document.querySelector('.site-navbar');
    if (!sentinella || !riga || !('IntersectionObserver' in window)) {
        return;
    }

    var pillola = document.querySelector('.navbar-pillola-brand');
    var slotIndietro = document.getElementById('pillolaSlotIndietro');
    var slotTitolo = document.getElementById('pillolaSlotTitolo');
    var slotContatore = document.getElementById('pillolaSlotFiltro');
    var sogliaMobile = window.matchMedia('(max-width: 1399.98px)');

    // Ricorda dove rimettere ciascun elemento spostato (genitore + fratello
    // successivo originali): popolato al momento dello spostamento, letto
    // solo per il ripristino. Vuoto = niente attualmente spostato.
    var posizioniOriginali = [];

    // Dimensione di partenza del titolo nella pillola (uguale al 32px gia'
    // impostato in navbar.css, ".pillola-slot-titolo .titolo-richiedi-preventivo")
    // e dimensione minima sotto cui non si scende mai: stesso principio di
    // "dimensioneTitoloMassima/Minima" in intestazione-categoria-sticky.js -
    // "Richiedi Preventivo" a 32px non entra nello spazio residuo tra i due
    // cerchietti sui telefoni piu' stretti (verificato: viene tagliato con
    // l'ellissi), va quindi ridotto come il titolo categoria, non lasciato
    // fisso
    var dimensioneTitoloMassima = 32;
    var dimensioneTitoloMinima = 16;

    // Riduce il font-size di "elemento" di 1px alla volta finche' la sua
    // larghezza (letta di nuovo ad ogni passo, non solo all'inizio) non
    // entra nel valore restituito da "calcolaLarghezzaDisponibile" o si
    // tocca il minimo - stessa funzione di intestazione-categoria-sticky.js
    function restringiFontSizeFinoA(elemento, dimensioneMassima, calcolaLarghezzaDisponibile) {
        var dimensione = dimensioneMassima;
        elemento.style.fontSize = dimensione + 'px';
        while (dimensione > dimensioneTitoloMinima && elemento.getBoundingClientRect().width > calcolaLarghezzaDisponibile()) {
            dimensione -= 1;
            elemento.style.fontSize = dimensione + 'px';
        }
        return elemento.getBoundingClientRect().width <= calcolaLarghezzaDisponibile();
    }

    // Parte sempre dal massimo, non dall'ultima dimensione usata, perche'
    // lo spazio disponibile puo' essere cambiato (resize, rotazione) da
    // quando e' stato ridotto l'ultima volta. "parentNode" controllato
    // apposta: se nel frattempo il titolo e' gia' tornato al suo posto
    // originale non c'e' niente da adattare
    function adattaDimensioneTitolo() {
        var titolo = document.getElementById('titoloRichiediPreventivo');
        if (!titolo || !slotTitolo || titolo.parentNode !== slotTitolo) {
            return;
        }
        restringiFontSizeFinoA(titolo, dimensioneTitoloMassima, function () {
            return slotTitolo.clientWidth;
        });
    }

    function elementiDaSpostare() {
        var indietro = riga.querySelector('.position-absolute.start-0');
        var titolo = riga.querySelector('h1');
        var contatore = riga.querySelector('.position-absolute.end-0');
        var risultato = [];
        if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
        if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
        if (contatore && slotContatore) { risultato.push([contatore, slotContatore]); }
        return risultato;
    }

    function spostaNellaPillola() {
        if (posizioniOriginali.length) {
            return; // gia' spostati, niente da fare
        }
        elementiDaSpostare().forEach(function (coppia) {
            var elemento = coppia[0];
            var slot = coppia[1];
            posizioniOriginali.push([elemento, elemento.parentNode, elemento.nextSibling]);
            slot.appendChild(elemento);
        });
        if (posizioniOriginali.length) {
            pillola.classList.add('pillola-modalita-categoria');
            riga.classList.add('contenuto-in-pillola-navbar');
            adattaDimensioneTitolo();
        }
    }

    function ripristinaPosizioneOriginale() {
        if (!posizioniOriginali.length) {
            return; // niente di spostato da rimettere a posto
        }
        posizioniOriginali.forEach(function (voce) {
            var elemento = voce[0];
            var genitoreOriginale = voce[1];
            var fratelloSuccessivoOriginale = voce[2];
            genitoreOriginale.insertBefore(elemento, fratelloSuccessivoOriginale);
        });
        posizioniOriginali = [];
        pillola.classList.remove('pillola-modalita-categoria');
        riga.classList.remove('contenuto-in-pillola-navbar');
        // Il font-size ridotto da "adattaDimensioneTitolo" e' inline (vince
        // sempre sulla regola CSS, che si applica solo dentro la pillola):
        // va tolto esplicitamente, altrimenti il titolo resterebbe piccolo
        // anche fuori dalla pillola, dove torna alla sua dimensione normale
        // (h1, gestita da CSS/Bootstrap)
        var titolo = document.getElementById('titoloRichiediPreventivo');
        if (titolo) {
            titolo.style.fontSize = '';
        }
    }

    var altezzaNavbar = navbar ? navbar.offsetHeight : 0;
    new IntersectionObserver(function (entries) {
        var agganciata = !entries[0].isIntersecting;
        riga.classList.toggle('intestazione-fissata', agganciata);

        if (!pillola || !slotIndietro || !slotTitolo || !slotContatore) {
            return; // pagina senza la pillola (non dovrebbe succedere, base.html la include sempre)
        }
        if (agganciata && sogliaMobile.matches) {
            spostaNellaPillola();
        } else {
            ripristinaPosizioneOriginale();
        }
    }, { rootMargin: '-' + altezzaNavbar + 'px 0px 0px 0px' }).observe(sentinella);

    // Se si ridimensiona la finestra oltre la soglia xxl mentre gli
    // elementi sono ancora spostati nella pillola, li rimette a posto -
    // stesso ragionamento di intestazione-categoria-sticky.js
    sogliaMobile.addEventListener('change', function (evento) {
        if (!evento.matches) {
            ripristinaPosizioneOriginale();
        }
    });

    // Ricalcola la dimensione del titolo se cambia lo spazio disponibile
    // nella pillola (resize della finestra, rotazione del telefono) -
    // "requestAnimationFrame" raggruppa gli eventi "resize" ravvicinati in
    // una sola misurazione per frame
    var adattamentoPianificato = false;
    window.addEventListener('resize', function () {
        if (adattamentoPianificato) {
            return;
        }
        adattamentoPianificato = true;
        requestAnimationFrame(function () {
            adattamentoPianificato = false;
            adattaDimensioneTitolo();
        });
    });
})();
