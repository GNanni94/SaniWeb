// Applica un bordo bianco a un elemento blu fluttuante quando si sovrappone
// a un altro sfondo blu (footer di pagina o footer di una card prodotto)

// Due rettangoli (getBoundingClientRect()) si sovrappongono solo se i loro
// intervalli si toccano su entrambi gli assi contemporaneamente
function siSovrappongono(a, b) {
    return a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
}

// Controlla se "rigaElemento" (getBoundingClientRect()) si sovrappone al
// footer di pagina o a un eventuale footer di card ("selettoreCardFooter", opzionale)
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

// Applica/toglie "classeCss" sull'elemento restituito da "otteniElemento()"
// in base a "elementoSuSfondoBlu", aggiornandosi su scroll/resize; ritorna
// la funzione di aggiornamento, richiamabile anche a mano
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
