// Fissa la riga titolo "Prodotti senza immagine" sotto la navbar da
// desktop, sposta indietro/titolo/filtro-ricerca nella pillola della
// navbar da telefono.
(function () {
    var riga = document.querySelector('.intestazione-categoria-sticky');
    if (!riga) {
        return;
    }

    // Restringe il titolo per farlo stare tra la freccia indietro e il
    // filtro/ricerca, mentre e' ancora nella riga normale (non in pillola)
    function adattaDimensioneTitoloRiga() {
        var titolo = document.getElementById('titoloProdottiSenzaImmagine');
        var slotTitolo = document.getElementById('pillolaSlotTitolo');
        if (!titolo || titolo.parentNode === slotTitolo) {
            return; // in questo momento e' nella pillola: se ne occupa pillola-titolo-sticky.js
        }
        var indietro = document.getElementById('btnTornaDashboard');
        var controlli = riga.querySelector('.slot-controlli-intestazione-fine');
        var margine = 8;
        var rigaRect = riga.getBoundingClientRect();
        var sinistra = indietro ? indietro.getBoundingClientRect().right + margine : rigaRect.left;
        var destra = controlli ? controlli.getBoundingClientRect().left - margine : rigaRect.right;
        var disponibile = destra - sinistra;

        titolo.style.fontSize = '';
        var dimensioneMassima = parseFloat(getComputedStyle(titolo).fontSize);

        titolo.style.whiteSpace = 'nowrap';
        var ciEntra = restringiFontSizeFinoA(titolo, dimensioneMassima, function () {
            return disponibile;
        });
        if (!ciEntra) {
            titolo.style.whiteSpace = '';
        }
    }

    inizializzaPillolaSticky({
        idSentinella: 'sentinellaIntestazione',
        selettoreRiga: '.intestazione-categoria-sticky',
        idTitolo: 'titoloProdottiSenzaImmagine',
        adattaDimensioneTitoloRiga: adattaDimensioneTitoloRiga,
        elementiDaSpostare: function (riga, slotIndietro, slotTitolo, slotFiltro) {
            var indietro = document.getElementById('btnTornaDashboard');
            var titolo = document.getElementById('titoloProdottiSenzaImmagine');
            // Filtro categoria + ricerca per codice, spostati insieme
            var controlli = riga.querySelector('.slot-controlli-intestazione-fine');
            var risultato = [];
            if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
            if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
            if (controlli && slotFiltro) { risultato.push([controlli, slotFiltro]); }
            return risultato;
        }
    });
})();
