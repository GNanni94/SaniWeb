// Fissa la riga titolo "Gestione Documenti" in cima allo scroll da
// desktop, la sposta nella pillola della navbar durante lo scroll da
// telefono (sotto la soglia xxl)
(function () {
    var riga = document.querySelector('.intestazione-categoria-sticky');
    if (!riga) {
        return;
    }

    inizializzaPillolaSticky({
        idSentinella: 'sentinellaIntestazione',
        selettoreRiga: '.intestazione-categoria-sticky',
        idTitolo: 'titoloGestioneDocumenti',
        elementiDaSpostare: function (riga, slotIndietro, slotTitolo, slotFiltro) {
            var indietro = document.getElementById('btnTornaDashboard');
            var titolo = document.getElementById('titoloGestioneDocumenti');
            var nuovoDocumento = document.getElementById('btnNuovoDocumento');
            var risultato = [];
            if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
            if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
            if (nuovoDocumento && slotFiltro) { risultato.push([nuovoDocumento, slotFiltro]); }
            return risultato;
        }
    });
})();
