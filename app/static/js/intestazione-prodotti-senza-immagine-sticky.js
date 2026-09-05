// Fissa la riga titolo "Prodotti senza immagine" sotto la navbar da
// desktop, sposta indietro/titolo nella pillola della navbar da telefono.
(function () {
    var riga = document.querySelector('.intestazione-categoria-sticky');
    if (!riga) {
        return;
    }

    inizializzaPillolaSticky({
        idSentinella: 'sentinellaIntestazione',
        selettoreRiga: '.intestazione-categoria-sticky',
        idTitolo: 'titoloProdottiSenzaImmagine',
        elementiDaSpostare: function (riga, slotIndietro, slotTitolo, slotFiltro) {
            var indietro = document.getElementById('btnTornaDashboard');
            var titolo = document.getElementById('titoloProdottiSenzaImmagine');
            var risultato = [];
            if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
            if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
            return risultato;
        }
    });
})();
