// Logica condivisa tra intestazione-categoria-sticky.js (prodotti_card.html/
// prodotti_tabella.html) e carrello-intestazione-sticky.js (carrello.html):
// entrambi spostano gli elementi interattivi di una riga titolo agganciata
// nella pillola destra della navbar durante lo scroll da telefono (sotto la
// soglia xxl), riusando gli stessi tre slot vuoti (base.html,
// "#pillolaSlotIndietro/Titolo/Filtro") e la stessa classe di stato
// ".navbar-pillola-brand.pillola-modalita-categoria" (navbar.css) -
// pensati apposta per essere generici nonostante il nome storico
// "categoria". Caricare questo file PRIMA dei due sopra.
//
// "restringiFontSizeFinoA" e' esposta a parte (non solo dentro la factory
// sotto) perche' intestazione-categoria-sticky.js la riusa anche per il
// titolo nella sua posizione NORMALE (non ancora in pillola) - caso che non
// esiste per la pagina carrello, quindi non generalizzato dentro la factory.
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
// - idSentinella: id dell'elemento la cui uscita dalla vista (scrollando
//   verso il basso) segna il punto di aggancio della riga
// - selettoreRiga: selettore CSS della riga stessa (riceve ".intestazione-fissata")
// - idTitolo: id dell'elemento titolo da restringere quando entra in pillola
// - elementiDaSpostare(riga, slotIndietro, slotTitolo, slotTerzo): ritorna le
//   coppie [elemento, slotDestinazione] da spostare - unica parte davvero
//   specifica di ciascuna pagina, il markup dentro "riga" e' diverso
// - adattaDimensioneTitoloRiga (opzionale): richiamata negli stessi punti in
//   cui la riga normale (non in pillola) potrebbe aver bisogno di restringere
//   il proprio titolo - solo intestazione-categoria-sticky.js ne ha bisogno
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

    // Ricorda dove rimettere ciascun elemento spostato (genitore + fratello
    // successivo originali): popolato al momento dello spostamento, letto
    // solo per il ripristino. Vuoto = niente attualmente spostato.
    var posizioniOriginali = [];

    // Dimensione di partenza del titolo nella pillola (uguale al 32px gia'
    // impostato in navbar.css per entrambe le pagine): un nome/testo troppo
    // lungo anche al minimo comune (16px, dentro restringiFontSizeFinoA)
    // resta gestito dal fallback nativo del contesto (ellissi in pillola),
    // invece di rimpicciolire fino all'illeggibile
    var DIMENSIONE_TITOLO_MASSIMA = 32;

    // Parte sempre dal massimo, non dall'ultima dimensione usata, perche' lo
    // spazio disponibile puo' essere cambiato (resize, rotazione) da quando
    // e' stato ridotto l'ultima volta. "parentNode" controllato apposta: se
    // nel frattempo il titolo e' gia' tornato al suo posto originale (es. si
    // e' risaliti sopra la soglia xxl proprio mentre questa funzione era in
    // coda a un resize) non c'e' niente da adattare
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
        // Il font-size ridotto da "adattaDimensioneTitolo" e' inline (vince
        // sempre sulla regola CSS, che si applica solo dentro la pillola):
        // va tolto esplicitamente, altrimenti il titolo resterebbe piccolo
        // anche fuori dalla pillola, dove torna alla sua dimensione normale
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
            adattaDimensioneTitoloRiga(); // pagina senza la pillola (non dovrebbe succedere, base.html la include sempre)
            return;
        }
        if (agganciata && sogliaMobile.matches) {
            spostaNellaPillola();
        } else {
            ripristinaPosizioneOriginale();
        }
        adattaDimensioneTitoloRiga();
    }, { rootMargin: '-' + altezzaNavbar + 'px 0px 0px 0px' }).observe(sentinella);

    // Dimensione iniziale, prima di qualunque scroll: l'observer qui sopra
    // scatta solo quando la sentinella entra/esce dalla vista, non al
    // caricamento della pagina se in quel momento e' gia' visibile
    adattaDimensioneTitoloRiga();

    // Se si ridimensiona la finestra oltre la soglia xxl mentre gli elementi
    // sono ancora spostati nella pillola, li rimette a posto: da desktop la
    // pillola torna "display: contents" (navbar.css), quindi elementi ancora
    // spostati li' dentro risulterebbero irraggiungibili
    sogliaMobile.addEventListener('change', function (evento) {
        if (!evento.matches) {
            ripristinaPosizioneOriginale();
        }
    });

    // Ricalcola la dimensione del titolo se cambia lo spazio disponibile
    // (resize della finestra, rotazione del telefono) - nella pillola se ci
    // si trova gia' dentro, nella riga normale altrimenti (una delle due
    // funzioni non fa nulla, in base a dove si trova il titolo in quel
    // momento). "requestAnimationFrame" raggruppa gli eventi "resize"
    // ravvicinati in una sola misurazione per frame
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
