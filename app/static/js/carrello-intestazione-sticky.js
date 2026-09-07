// Riga titolo "Richiedi Preventivo" inglobata nella pillola della navbar
// durante lo scroll da telefono: sposta il bottone "Torna al catalogo" e
// l'h1 negli slot della pillola (spostamento, restringimento del titolo e
// IntersectionObserver sono logica condivisa in pillola-titolo-sticky.js)
(function () {
    inizializzaPillolaSticky({
        idSentinella: 'sentinellaIntestazioneCarrello',
        selettoreRiga: '.intestazione-carrello-sticky',
        idTitolo: 'titoloRichiediPreventivo',
        elementiDaSpostare: function (riga, slotIndietro, slotTitolo) {
            var indietro = riga.querySelector('.position-absolute.start-0');
            var titolo = riga.querySelector('h1');
            var risultato = [];
            if (indietro && slotIndietro) { risultato.push([indietro, slotIndietro]); }
            if (titolo && slotTitolo) { risultato.push([titolo, slotTitolo]); }
            return risultato;
        }
    });
})();
