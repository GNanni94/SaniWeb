// Riga titolo "Gestione Documenti" fissata in cima allo scroll da desktop
// (".intestazione-categoria-sticky" in prodotti.css, riusata cosi' com'e' -
// nome storico "categoria" ma generico, vedi commento in
// pillola-titolo-sticky.js), e spostata nella pillola della navbar durante
// lo scroll da telefono (sotto la soglia xxl): stesso comportamento e
// stessa libreria condivisa gia' usate da prodotti_card.html/
// prodotti_tabella.html (intestazione-categoria-sticky.js) e da
// carrello.html (carrello-intestazione-sticky.js). Qui restano solo gli
// elementi specifici di questa pagina da spostare - "Gestione Documenti" e'
// un titolo fisso e corto, niente restringimento dinamico del font (a
// differenza del nome categoria, che puo' essere lungo).
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
