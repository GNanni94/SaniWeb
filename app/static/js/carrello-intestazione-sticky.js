// Riga titolo "Richiedi Preventivo" (carrello.html) inglobata nella pillola
// della navbar durante lo scroll da telefono: stessa animazione di
// prodotti_card.html/prodotti_tabella.html, riscritta qui solo per il
// markup di questa pagina (bottone "Torna al catalogo" e h1 - non
// indietro/titolo-categoria/filtro). Lo spostamento nella
// pillola, il restringimento del titolo li' dentro, e l'IntersectionObserver
// sono logica condivisa con intestazione-categoria-sticky.js - vive in
// pillola-titolo-sticky.js (caricato prima di questo file), qui resta solo
// la parte specifica di questa pagina: quali elementi spostare.
//
// Riusa pero' DAVVERO (nessuna duplicazione) gli stessi tre slot vuoti
// della pillola (base.html, "#pillolaSlotIndietro/Titolo/Filtro") e la
// stessa classe di stato ".navbar-pillola-brand.pillola-modalita-categoria"
// (navbar.css): sono gia' pensati per essere generici e riusabili da
// qualunque pagina nonostante il nome storico "categoria" - vedi
// Docs/superpowers/specs/2026-08-30-pillola-titolo-categoria-scroll-design.md,
// sezione "Struttura: nuovi slot vuoti nella pillola".
//
// Differenza principale rispetto allo script della pagina catalogo: li'
// viene spostato solo il link del titolo (#titoloCategoriaLink), lasciando
// l'<h1> (nascosto via CSS) al suo posto per via del contenitore
// ".controlli-categoria-wrapper" che deve continuare a renderizzare (contiene
// un bottone "position: fixed"). Qui non c'e' nessun elemento fisso dentro
// la riga: si sposta l'<h1> per intero, la riga risulta quindi
// completamente vuota da agganciata (nessun bisogno di nascondere altro, e
// nessun bisogno di restringere il titolo mentre e' ancora nella riga
// normale - a differenza del catalogo, qui non c'e' testo che rischi di
// finire sotto ai cerchietti mentre e' ancora fuori dalla pillola).
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
