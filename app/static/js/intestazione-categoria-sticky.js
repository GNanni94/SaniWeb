// Riga titolo/filtro/ricerca fissata subito sotto la navbar durante lo
// scroll da desktop, condivisa tra prodotti_card.html e
// prodotti_tabella.html. Lo spostamento nella pillola della navbar da
// telefono e l'aggancio/sgancio della riga vivono in
// pillola-titolo-sticky.js; qui restano solo gli elementi da spostare e il
// restringimento del titolo nella riga normale, fuori pillola
(function () {
    var riga = document.querySelector('.intestazione-categoria-sticky');
    if (!riga) {
        return;
    }

    // Restringe il titolo nella riga normale (fuori pillola) calcolando lo
    // spazio tra "Torna al catalogo" e i controlli, entrambi "position: absolute"
    function adattaDimensioneTitoloRiga() {
        var titolo = document.getElementById('titoloCategoriaLink');
        var slotTitolo = document.getElementById('pillolaSlotTitolo');
        if (!titolo || titolo.parentNode === slotTitolo) {
            return; // gia' nella pillola: se ne occupa pillola-titolo-sticky.js
        }
        var indietro = riga.querySelector('.btn-torna-catalogo');
        var controlli = riga.querySelector('.controlli-categoria-wrapper');
        var margine = 8;
        var rigaRect = riga.getBoundingClientRect();
        var sinistra = indietro ? indietro.getBoundingClientRect().right + margine : rigaRect.left;
        var destra = controlli ? controlli.getBoundingClientRect().left - margine : rigaRect.right;
        var disponibile = destra - sinistra;

        // Legge la dimensione naturale del titolo dopo aver tolto un eventuale font-size inline impostato in precedenza
        titolo.style.fontSize = '';
        var dimensioneMassima = parseFloat(getComputedStyle(titolo).fontSize);

        // nowrap solo per misurare la larghezza naturale del testo su una riga sola
        titolo.style.whiteSpace = 'nowrap';
        var ciEntra = restringiFontSizeFinoA(titolo, dimensioneMassima, function () {
            return disponibile;
        });
        // Se non ci sta nemmeno al minimo, torna all'a-capo su piu' righe
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
            // #filtroProdottiWrapper su prodotti_card.html, #filtroTabellaWrapper su prodotti_tabella.html
            var filtro = riga.querySelector('#filtroProdottiWrapper, #filtroTabellaWrapper');
            var risultato = [];
            if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
            if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
            if (filtro && slotFiltro) { risultato.push([filtro, slotFiltro]); }
            return risultato;
        }
    });
})();
