// Logica condivisa tra intestazione-categoria-sticky.js e
// carrello-intestazione-sticky.js: sposta gli elementi interattivi di una
// riga titolo agganciata nella pillola della navbar durante lo scroll da
// telefono, riusando gli stessi tre slot vuoti e la stessa classe di stato
//
// Esposta a parte perche' riusata anche per il titolo nella sua posizione normale, fuori pillola
function restringiFontSizeFinoA(elemento, dimensioneMassima, calcolaLarghezzaDisponibile) {
    var DIMENSIONE_MINIMA = 16;
    var dimensione = dimensioneMassima;
    elemento.style.fontSize = dimensione + 'px';
    while (dimensione > DIMENSIONE_MINIMA && elemento.getBoundingClientRect().width > calcolaLarghezzaDisponibile()) {
        dimensione -= 1;
        elemento.style.fontSize = dimensione + 'px';
    }
    return elemento.getBoundingClientRect().width <= calcolaLarghezzaDisponibile();
}

// "opzioni":
// - idSentinella: id dell'elemento la cui uscita dalla vista segna il punto di aggancio della riga
// - selettoreRiga: selettore CSS della riga stessa (riceve ".intestazione-fissata")
// - idTitolo: id dell'elemento titolo da restringere quando entra in pillola
// - elementiDaSpostare(riga, slotIndietro, slotTitolo, slotTerzo): ritorna le coppie [elemento, slotDestinazione] da spostare
// - adattaDimensioneTitoloRiga (opzionale): restringe il titolo nella riga normale, fuori pillola
function inizializzaPillolaSticky(opzioni) {
    var sentinella = document.getElementById(opzioni.idSentinella);
    var riga = document.querySelector(opzioni.selettoreRiga);
    var navbar = document.querySelector('.site-navbar');
    if (!sentinella || !riga || !('IntersectionObserver' in window)) {
        return;
    }

    var pillola = document.querySelector('.navbar-pillola-brand');
    var slotIndietro = document.getElementById('pillolaSlotIndietro');
    var slotTitolo = document.getElementById('pillolaSlotTitolo');
    var slotTerzo = document.getElementById('pillolaSlotFiltro');
    var sogliaMobile = window.matchMedia('(max-width: 1399.98px)');
    var adattaDimensioneTitoloRiga = opzioni.adattaDimensioneTitoloRiga || function () {};

    // Genitore + fratello successivo originali di ogni elemento spostato, per il ripristino. Vuoto = niente spostato
    var posizioniOriginali = [];

    // Dimensione di partenza del titolo nella pillola
    var DIMENSIONE_TITOLO_MASSIMA = 32;

    // Riparte sempre dalla dimensione massima; non fa nulla se il titolo non e' (piu') nella pillola
    function adattaDimensioneTitolo() {
        var titolo = document.getElementById(opzioni.idTitolo);
        if (!titolo || !slotTitolo || titolo.parentNode !== slotTitolo) {
            return;
        }
        restringiFontSizeFinoA(titolo, DIMENSIONE_TITOLO_MASSIMA, function () {
            return slotTitolo.clientWidth;
        });
    }

    function spostaNellaPillola() {
        if (posizioniOriginali.length) {
            return; // gia' spostati, niente da fare
        }
        opzioni.elementiDaSpostare(riga, slotIndietro, slotTitolo, slotTerzo).forEach(function (coppia) {
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
        // Rimuove il font-size inline impostato da adattaDimensioneTitolo
        var titolo = document.getElementById(opzioni.idTitolo);
        if (titolo) {
            titolo.style.fontSize = '';
        }
    }

    var altezzaNavbar = navbar ? navbar.offsetHeight : 0;
    new IntersectionObserver(function (entries) {
        var agganciata = !entries[0].isIntersecting;
        riga.classList.toggle('intestazione-fissata', agganciata);

        if (!pillola || !slotIndietro || !slotTitolo || !slotTerzo) {
            adattaDimensioneTitoloRiga(); // pagina senza la pillola
            return;
        }
        if (agganciata && sogliaMobile.matches) {
            spostaNellaPillola();
        } else {
            ripristinaPosizioneOriginale();
        }
        adattaDimensioneTitoloRiga();
    }, { rootMargin: '-' + altezzaNavbar + 'px 0px 0px 0px' }).observe(sentinella);

    // Dimensione iniziale, prima di qualunque scroll
    adattaDimensioneTitoloRiga();

    // Rimette a posto gli elementi se si torna sopra la soglia xxl mentre sono ancora nella pillola
    sogliaMobile.addEventListener('change', function (evento) {
        if (!evento.matches) {
            ripristinaPosizioneOriginale();
        }
    });

    // Ricalcola la dimensione del titolo su resize, raggruppando gli eventi con requestAnimationFrame
    var adattamentoPianificato = false;
    window.addEventListener('resize', function () {
        if (adattamentoPianificato) {
            return;
        }
        adattamentoPianificato = true;
        requestAnimationFrame(function () {
            adattamentoPianificato = false;
            if (posizioniOriginali.length) {
                adattaDimensioneTitolo();
            } else {
                adattaDimensioneTitoloRiga();
            }
        });
    });
}
