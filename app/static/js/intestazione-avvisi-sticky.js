// Fissa la riga titolo "Avvisi di chiusura" sotto la navbar da desktop,
// la sposta nella pillola della navbar da telefono
(function () {
    var riga = document.querySelector('.intestazione-categoria-sticky');
    if (!riga) {
        return;
    }

    inizializzaPillolaSticky({
        idSentinella: 'sentinellaIntestazione',
        selettoreRiga: '.intestazione-categoria-sticky',
        idTitolo: 'titoloGestioneAvvisi',
        elementiDaSpostare: function (riga, slotIndietro, slotTitolo, slotFiltro) {
            var indietro = document.getElementById('btnTornaDashboard');
            var titolo = document.getElementById('titoloGestioneAvvisi');
            var nuovoAvviso = document.getElementById('btnNuovoAvviso');
            var risultato = [];
            if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
            if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
            if (nuovoAvviso && slotFiltro) { risultato.push([nuovoAvviso, slotFiltro]); }
            return risultato;
        }
    });
})();
