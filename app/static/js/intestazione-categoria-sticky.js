// Riga titolo/filtro/ricerca fissata in cima allo scroll da desktop, subito
// sotto alla navbar (anche lei fissata, vedi altezza-navbar.js/
// ".site-navbar" in navbar.css - ".intestazione-categoria-sticky" in
// prodotti.css, "position: sticky" di suo): grazie a "#sentinellaIntestazione"
// (altezza vera, vedi il commento nel template che la usa) la riga scorre
// normalmente insieme al resto della pagina per un tratto, e si aggancia
// solo quando la navbar la raggiunge davvero - esattamente li' si aggiunge
// ".intestazione-fissata" (bordo/pillola in prodotti.css), osservando
// quando la sentinella esce dalla vista scrollando verso il basso.
// "rootMargin" ridotto dell'altezza della navbar: senza, l'osservatore la
// considera "ancora visibile" (quindi riga non ancora agganciata) finche'
// non esce dal tutto in cima allo schermo (y=0), invece del punto vero in
// cui la riga si aggancia (y=altezza navbar, la navbar sopra di lei la
// copre gia' da li')
//
// Condiviso tra prodotti_card.html e prodotti_tabella.html (entrambi
// passano "intestazione_sticky=True" a "partials/intestazione_categoria.html"
// e includono questo stesso script): nessun riferimento a markup specifico
// di una sola delle due pagine, solo gli id/classi generici qui sopra.
//
// Sotto la soglia xxl (stessa soglia di tutto il resto della navbar
// mobile, vedi navbar.css), quando la riga si aggancia i suoi 3 elementi
// interattivi ("Torna al catalogo", titolo, filtro) vengono SPOSTATI (non
// clonati) dentro la pillola destra della navbar (".navbar-pillola-brand"
// in base.html, slot vuoti "#pillolaSlot*"), al posto di logo/icone:
// restano gli stessi nodi con gli stessi listener di sempre (il filtro
// continua a funzionare via AJAX/DataTables esattamente come prima),
// cambia solo il genitore nel DOM. "parentNode"/"nextSibling" di ciascun
// elemento vengono ricordati al momento dello spostamento, per rimetterlo
// ESATTAMENTE al suo posto originale quando si risale sopra la soglia di
// aggancio (o quando si ridimensiona la finestra oltre la soglia xxl
// mentre e' ancora spostato, vedi il listener "change" in fondo) -
// "insertBefore(el, next)" con "next" nullo si comporta come
// "appendChild" (l'elemento era l'ultimo figlio del suo genitore),
// gestendo quindi entrambi i casi con la stessa istruzione.
(function () {
    var sentinella = document.getElementById('sentinellaIntestazione');
    var riga = document.querySelector('.intestazione-categoria-sticky');
    var navbar = document.querySelector('.site-navbar');
    if (!sentinella || !riga || !('IntersectionObserver' in window)) {
        return;
    }

    var pillola = document.querySelector('.navbar-pillola-brand');
    var slotIndietro = document.getElementById('pillolaSlotIndietro');
    var slotTitolo = document.getElementById('pillolaSlotTitolo');
    var slotFiltro = document.getElementById('pillolaSlotFiltro');
    var sogliaMobile = window.matchMedia('(max-width: 1399.98px)');

    // Ricorda dove rimettere ciascun elemento spostato (genitore + fratello
    // successivo originali): popolato al momento dello spostamento, letto
    // solo per il ripristino. Vuoto = niente attualmente spostato.
    var posizioniOriginali = [];

    function elementiDaSpostare() {
        var indietro = riga.querySelector('.btn-torna-catalogo');
        var titolo = document.getElementById('titoloCategoriaLink');
        // Selettore doppio: "#filtroProdottiWrapper" su prodotti_card.html,
        // "#filtroTabellaWrapper" su prodotti_tabella.html - entrambi gia'
        // presenti nel markup al caricamento pagina (nessuno dei due e'
        // creato da zero via JS, vedi partials/controlli_ricerca_filtro_card.html
        // e partials/controlli_ricerca_filtro_tabella.html), cercato qui a
        // runtime comunque per non dipendere dall'ordine di caricamento
        // degli script
        var filtro = riga.querySelector('#filtroProdottiWrapper, #filtroTabellaWrapper');
        var risultato = [];
        if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
        if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
        if (filtro && slotFiltro) { risultato.push([filtro, slotFiltro]); }
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
    }

    var altezzaNavbar = navbar ? navbar.offsetHeight : 0;
    new IntersectionObserver(function (entries) {
        var agganciata = !entries[0].isIntersecting;
        riga.classList.toggle('intestazione-fissata', agganciata);

        if (!pillola || !slotIndietro || !slotTitolo || !slotFiltro) {
            return; // pagina senza la pillola (non dovrebbe succedere, base.html la include sempre)
        }
        if (agganciata && sogliaMobile.matches) {
            spostaNellaPillola();
        } else {
            ripristinaPosizioneOriginale();
        }
    }, { rootMargin: '-' + altezzaNavbar + 'px 0px 0px 0px' }).observe(sentinella);

    // Se si ridimensiona la finestra oltre la soglia xxl mentre gli
    // elementi sono ancora spostati nella pillola (es. si ridimensiona il
    // browser durante lo scroll), li rimette a posto: da desktop la
    // pillola torna "display: contents" (navbar.css), quindi elementi
    // ancora spostati li' dentro risulterebbero irraggiungibili
    sogliaMobile.addEventListener('change', function (evento) {
        if (!evento.matches) {
            ripristinaPosizioneOriginale();
        }
    });
})();
