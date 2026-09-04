// Riga titolo/filtro/ricerca fissata in cima allo scroll da desktop, subito
// sotto alla navbar (anche lei fissata, vedi altezza-navbar.js/
// ".site-navbar" in navbar.css - ".intestazione-categoria-sticky" in
// prodotti.css, "position: sticky" di suo): grazie a "#sentinellaIntestazione"
// (altezza vera, vedi il commento nel template che la usa) la riga scorre
// normalmente insieme al resto della pagina per un tratto, e si aggancia
// solo quando la navbar la raggiunge davvero.
//
// Condiviso tra prodotti_card.html e prodotti_tabella.html (entrambi
// passano "intestazione_sticky=True" a "partials/intestazione_categoria.html"
// e includono questo stesso script): nessun riferimento a markup specifico
// di una sola delle due pagine, solo gli id/classi generici qui sotto.
//
// Lo spostamento nella pillola della navbar durante lo scroll da telefono
// (sotto la soglia xxl), il restringimento del titolo li' dentro, e
// l'IntersectionObserver che aggancia/sgancia la riga sono logica condivisa
// con carrello-intestazione-sticky.js - vive in pillola-titolo-sticky.js
// (caricato prima di questo file), qui restano solo le parti specifiche di
// questa pagina: quali elementi spostare, e il restringimento del titolo
// mentre e' ancora nella riga normale (non ancora agganciata/in pillola).
(function () {
    var riga = document.querySelector('.intestazione-categoria-sticky');
    if (!riga) {
        return;
    }

    // Titolo nella sua posizione normale (riga "Torna al catalogo" / titolo
    // / filtro, prima dell'aggancio - o su schermi xxl+, dove non si sposta
    // mai nella pillola). A differenza della pillola qui la larghezza
    // disponibile non e' quella di un contenitore: "Torna al catalogo"/i
    // controlli sono "position: absolute" (vedi
    // partials/intestazione_categoria.html), non riservano spazio di loro
    // al titolo - senza calcolarlo a mano il testo ci finirebbe sotto (bug
    // reale verificato: "PRODOTTI PER PISCINE" passava dietro ai due
    // cerchietti). Il margine di sicurezza (8px, ".5rem") e' lo stesso gia'
    // usato in prodotti.css per lo spazio tra riga e cerchietti quando la
    // riga e' agganciata (".intestazione-fissata .btn-torna-catalogo"/
    // ".controlli-categoria-wrapper")
    function adattaDimensioneTitoloRiga() {
        var titolo = document.getElementById('titoloCategoriaLink');
        var slotTitolo = document.getElementById('pillolaSlotTitolo');
        if (!titolo || titolo.parentNode === slotTitolo) {
            return; // in questo momento e' nella pillola: se ne occupa pillola-titolo-sticky.js
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

    inizializzaPillolaSticky({
        idSentinella: 'sentinellaIntestazione',
        selettoreRiga: '.intestazione-categoria-sticky',
        idTitolo: 'titoloCategoriaLink',
        adattaDimensioneTitoloRiga: adattaDimensioneTitoloRiga,
        elementiDaSpostare: function (riga, slotIndietro, slotTitolo, slotFiltro) {
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
    });
})();
