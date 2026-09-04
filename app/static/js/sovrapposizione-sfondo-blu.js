// Logica condivisa per dare un bordo bianco a un elemento blu fluttuante
// quando finisce sopra un altro sfondo blu (footer di pagina, o footer
// pieno di una card prodotto) - altrimenti si confonderebbe visivamente con
// lo sfondo. Usata da carrello-flottante.js (globale),
// controlli-ricerca-filtro-card.js/controlli-ricerca-filtro-tabella.js
// (cerchio di ricerca in prodotti_card.html/prodotti_tabella.html) e
// dashboard-prodotti-immagini.html - caricare questo file PRIMA di ciascuno.

// Due rettangoli (nel formato di "getBoundingClientRect()": top/bottom/
// left/right in pixel dal viewport) si sovrappongono solo se i loro
// intervalli si toccano su ENTRAMBI gli assi contemporaneamente - basta che
// uno solo dei due assi non si tocchi perche' i rettangoli non si tocchino
// affatto nello spazio 2D
function siSovrappongono(a, b) {
    return a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
}

// "rigaElemento": il rettangolo (getBoundingClientRect()) dell'elemento da
// controllare. "selettoreCardFooter" (opzionale): selettore CSS di eventuali
// footer di card da controllare anche loro (2D, le card possono essere
// disposte su piu' colonne) oltre al footer di pagina (basta un controllo
// verticale: occupa sempre tutta la larghezza ed e' sempre l'ultimo
// elemento della pagina) - omesso nelle pagine senza card (tabelle,
// dashboard), dove "querySelectorAll" su un selettore inesistente
// tornerebbe comunque una lista vuota, ma e' piu' chiaro ometterlo del tutto
function elementoSuSfondoBlu(rigaElemento, selettoreCardFooter) {
    var footer = document.querySelector('.site-footer');
    if (footer && footer.getBoundingClientRect().top < rigaElemento.bottom) {
        return true;
    }
    if (!selettoreCardFooter) {
        return false;
    }
    var footerCard = document.querySelectorAll(selettoreCardFooter);
    for (var i = 0; i < footerCard.length; i++) {
        if (siSovrappongono(footerCard[i].getBoundingClientRect(), rigaElemento)) {
            return true;
        }
    }
    return false;
}

// Crea e attiva subito un aggiornatore: applica/toglie "classeCss"
// sull'elemento restituito da "otteniElemento()" in base al risultato di
// "elementoSuSfondoBlu", si aggiorna da solo su scroll/resize, e viene
// eseguito una prima volta subito. "otteniElemento" e' una funzione (non
// l'elemento stesso) perche' in carrello-flottante.js il bottone puo'
// essere distrutto e ricreato (widget rigenerato da zero) - una funzione
// lo ricerca sempre fresco nel DOM, un riferimento diretto diventerebbe
// stale dopo la ricreazione. Ritorna la funzione di aggiornamento, cosi'
// chi la crea puo' richiamarla anche a mano quando serve (es.
// dashboard-prodotti-immagini.js dopo un filtro che nasconde/mostra righe,
// un cambiamento che non genera da solo nessun evento scroll/resize)
function creaAggiornatoreSuSfondoBlu(otteniElemento, classeCss, selettoreCardFooter) {
    function aggiorna() {
        var elemento = otteniElemento();
        if (!elemento) {
            return;
        }
        elemento.classList.toggle(classeCss, elementoSuSfondoBlu(elemento.getBoundingClientRect(), selettoreCardFooter));
    }
    aggiorna();
    window.addEventListener('scroll', aggiorna, { passive: true });
    window.addEventListener('resize', aggiorna);
    return aggiorna;
}
