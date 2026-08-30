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

    // Dimensione di partenza del titolo nella pillola (uguale al 32px gia'
    // impostato in navbar.css, ".pillola-slot-titolo #titoloCategoriaLink",
    // usato come valore iniziale finche' questo script non e' ancora
    // intervenuto) e dimensione minima comune sotto cui non si scende mai,
    // ne' qui ne' nella riga normale (funzione qui sotto): un nome
    // categoria troppo lungo anche a 16px resta gestito dal fallback
    // nativo di ciascun contesto (ellissi nella pillola, a-capo nella riga -
    // vedi le due funzioni), invece di rimpicciolire fino all'illeggibile
    var dimensioneTitoloMassima = 32;
    var dimensioneTitoloMinima = 16;

    // Riduce il font-size di "elemento" di 1px alla volta finche' la sua
    // larghezza (letta di nuovo ad ogni passo, non solo all'inizio: cambia
    // insieme al font-size) non entra nel valore restituito da
    // "calcolaLarghezzaDisponibile" o si tocca il minimo comune - usata sia
    // per il titolo nella pillola sia per lo stesso titolo nella riga
    // normale (vedi le due funzioni sotto che la chiamano), cosi' la
    // logica di riduzione resta scritta una volta sola. Ritorna se e'
    // riuscita a farlo entrare oppure no (il chiamante nella riga normale
    // ne ha bisogno per decidere il fallback quando nemmeno il minimo basta)
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
    // originale (es. si e' risaliti sopra la soglia xxl proprio mentre
    // questa funzione era in coda a un resize) non c'e' niente da adattare
    function adattaDimensioneTitolo() {
        var titolo = document.getElementById('titoloCategoriaLink');
        if (!titolo || !slotTitolo || titolo.parentNode !== slotTitolo) {
            return;
        }
        restringiFontSizeFinoA(titolo, dimensioneTitoloMassima, function () {
            return slotTitolo.clientWidth;
        });
    }

    // Stesso meccanismo, per il titolo nella sua posizione normale (riga
    // "Torna al catalogo" / titolo / filtro, prima dell'aggancio - o su
    // schermi xxl+, dove non si sposta mai nella pillola). A differenza
    // della pillola qui la larghezza disponibile non e' quella di un
    // contenitore: "Torna al catalogo"/i controlli sono "position: absolute"
    // (vedi partials/intestazione_categoria.html), non riservano spazio di
    // loro al titolo - senza calcolarlo a mano il testo ci finirebbe sotto
    // (bug reale verificato: "PRODOTTI PER PISCINE" passava dietro ai due
    // cerchietti). Il margine di sicurezza (8px, ".5rem") e' lo stesso gia'
    // usato in prodotti.css per lo spazio tra riga e cerchietti quando la
    // riga e' agganciata (".intestazione-fissata .btn-torna-catalogo"/
    // ".controlli-categoria-wrapper")
    function adattaDimensioneTitoloRiga() {
        var titolo = document.getElementById('titoloCategoriaLink');
        if (!titolo || titolo.parentNode === slotTitolo) {
            return; // in questo momento e' nella pillola: se ne occupa adattaDimensioneTitolo()
        }
        var indietro = riga.querySelector('.btn-torna-catalogo');
        var controlli = riga.querySelector('.controlli-categoria-wrapper');
        var margine = 8;
        var rigaRect = riga.getBoundingClientRect();
        var sinistra = indietro ? indietro.getBoundingClientRect().right + margine : rigaRect.left;
        var destra = controlli ? controlli.getBoundingClientRect().left - margine : rigaRect.right;
        var disponibile = destra - sinistra;

        // Dimensione "naturale" del titolo in questo momento (Bootstrap/RFS
        // la fa gia' variare da sola in base al viewport, a differenza dei
        // 32px fissi della pillola): letta via "getComputedStyle" dopo aver
        // tolto un eventuale font-size inline impostato da un giro
        // precedente di questa stessa funzione, altrimenti si leggerebbe
        // quella gia' ridotta invece di quella di partenza
        titolo.style.fontSize = '';
        var dimensioneMassima = parseFloat(getComputedStyle(titolo).fontSize);

        // "nowrap" solo per la misurazione/riduzione: la larghezza naturale
        // del testo su una riga sola, non quella (piu' corta, falserebbe il
        // confronto) dopo un a-capo
        titolo.style.whiteSpace = 'nowrap';
        var ciEntra = restringiFontSizeFinoA(titolo, dimensioneMassima, function () {
            return disponibile;
        });
        // Nome davvero troppo lungo, non ci sta nemmeno al minimo: meglio
        // tornare al comportamento di sempre (a-capo su piu' righe, dentro
        // pero' alla dimensione minima gia' raggiunta) che restare su una
        // riga sola sovrapposta ai cerchietti
        if (!ciEntra) {
            titolo.style.whiteSpace = '';
        }
    }

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
        var titolo = document.getElementById('titoloCategoriaLink');
        if (titolo) {
            titolo.style.fontSize = '';
        }
    }

    var altezzaNavbar = navbar ? navbar.offsetHeight : 0;
    new IntersectionObserver(function (entries) {
        var agganciata = !entries[0].isIntersecting;
        riga.classList.toggle('intestazione-fissata', agganciata);

        if (!pillola || !slotIndietro || !slotTitolo || !slotFiltro) {
            adattaDimensioneTitoloRiga(); // pagina senza la pillola (non dovrebbe succedere, base.html la include sempre)
            return;
        }
        if (agganciata && sogliaMobile.matches) {
            spostaNellaPillola();
        } else {
            ripristinaPosizioneOriginale();
        }
        // I due cerchietti si spostano di ".5rem" quando la riga si
        // aggancia (".intestazione-fissata" in prodotti.css): rincalcola
        // sempre, non solo quando il titolo resta nella riga (su xxl+ non
        // si sposta mai nella pillola, quindi questo e' l'unico punto in
        // cui il suo spazio disponibile viene ricontrollato durante lo
        // scroll) - la funzione stessa non fa nulla se in questo momento
        // il titolo e' invece dentro la pillola
        adattaDimensioneTitoloRiga();
    }, { rootMargin: '-' + altezzaNavbar + 'px 0px 0px 0px' }).observe(sentinella);

    // Dimensione iniziale, prima di qualunque scroll: l'observer qui sopra
    // scatta solo quando la sentinella entra/esce dalla vista, non al
    // caricamento della pagina se in quel momento e' gia' visibile
    adattaDimensioneTitoloRiga();

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

    // Ricalcola la dimensione del titolo se cambia lo spazio disponibile
    // (resize della finestra, rotazione del telefono) - nella pillola se ci
    // si trova gia' dentro, nella riga normale altrimenti (una delle due
    // funzioni non fa nulla, in base a dove si trova il titolo in quel
    // momento). "requestAnimationFrame" raggruppa gli eventi "resize"
    // ravvicinati (ne arrivano molti durante un trascinamento) in una sola
    // misurazione per frame, invece di ricalcolare ad ogni singolo evento
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
})();
