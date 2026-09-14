// Riga titolo fissata sotto la navbar durante lo scroll da desktop, spostata
// nella pillola della navbar da telefono: condivisa da gestione_documenti.html
// e dashboard_prodotti_senza_immagine.html (partials/intestazione_categoria.html,
// famiglia "gestione" - non ancora gestione_avvisi.html). Lo spostamento in
// pillola e l'aggancio/sgancio della riga vivono in pillola-titolo-sticky.js;
// qui restano solo gli elementi da spostare e il restringimento del titolo
// nella riga normale, fuori pillola
(function () {
    var riga = document.querySelector('.intestazione-categoria-sticky');
    var elementoTitolo = riga ? riga.querySelector('.titolo-categoria-link') : null;
    if (!riga || !elementoTitolo) {
        return;
    }
    var idTitolo = elementoTitolo.id;

    // Restringe il titolo nella riga normale (fuori pillola) calcolando lo
    // spazio tra bottone indietro e controlli, entrambi "position: absolute"
    function adattaDimensioneTitoloRiga() {
        var titolo = document.getElementById(idTitolo);
        var slotTitolo = document.getElementById('pillolaSlotTitolo');
        if (!titolo || titolo.parentNode === slotTitolo) {
            return; // gia' nella pillola: se ne occupa pillola-titolo-sticky.js
        }
        var indietro = document.getElementById('btnTornaDashboard');
        var controlli = riga.querySelector('.controlli-intestazione-wrapper');
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
        idTitolo: idTitolo,
        adattaDimensioneTitoloRiga: adattaDimensioneTitoloRiga,
        elementiDaSpostare: function (riga, slotIndietro, slotTitolo, slotFiltro) {
            var indietro = document.getElementById('btnTornaDashboard');
            var titolo = document.getElementById(idTitolo);
            // "#filtroSezioneDocumentiWrapper" (gestione_documenti.html): solo il
            // filtro, non anche "#btnNuovoDocumento" (gia' un cerchio fluttuante
            // fisso in basso a sinistra da telefono - documenti.css - e non
            // dimensionato per stare nella pillola a fianco del filtro).
            // "dashboard_prodotti_senza_immagine.html" non ha un id cosi'
            // specifico: sposta l'intero blocco filtro+ricerca
            var controlli = riga.querySelector('#filtroSezioneDocumentiWrapper') || riga.querySelector('.controlli-intestazione-wrapper');
            var risultato = [];
            if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
            if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
            if (controlli && slotFiltro) { risultato.push([controlli, slotFiltro]); }
            return risultato;
        }
    });
})();
