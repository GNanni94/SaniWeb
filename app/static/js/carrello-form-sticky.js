// Il form "Richiedi preventivo" segue lo scroll della lista prodotti e si
// aggancia al fondo dell'ultima card, gestito a mano invece che con
// "position: sticky" puro
(function () {
    var BREAKPOINT_LG = 992; // breakpoint "lg" di Bootstrap: sotto, le colonne si impilano
    var RESPIRO = 16; // 1rem di respiro tra il fondo della riga titolo e la card

    var colonnaLista = document.getElementById('colonnaListaCarrello');
    var colonnaForm = document.getElementById('colonnaFormPreventivo');
    var card = document.getElementById('cardFormPreventivo');
    var rigaIntestazione = document.querySelector('.intestazione-carrello-sticky');
    if (!colonnaLista || !colonnaForm || !card) {
        return;
    }

    // Offset superiore della card: il fondo reale della riga titolo "Richiedi Preventivo" qui sopra
    function margineSuperiore() {
        if (!rigaIntestazione) {
            return RESPIRO;
        }
        return rigaIntestazione.getBoundingClientRect().bottom + RESPIRO;
    }

    function resetta() {
        card.style.position = '';
        card.style.top = '';
        card.style.left = '';
        card.style.width = '';
    }

    function aggiorna() {
        if (window.innerWidth < BREAKPOINT_LG) {
            colonnaForm.style.minHeight = '';
            resetta();
            return;
        }

        // Riparte dal flusso normale prima di misurare, per una misura corretta
        resetta();

        var rigaCard = card.getBoundingClientRect();
        var altezzaCard = rigaCard.height;
        var larghezzaCard = rigaCard.width;
        var colonnaFormRect = colonnaForm.getBoundingClientRect();
        // Rientro della card rispetto al bordo della colonna (padding Bootstrap), conservato anche in absolute
        var insetSinistro = rigaCard.left - colonnaFormRect.left;

        // Altezza minima della colonna, costante anche quando la card esce dal flusso normale
        colonnaForm.style.minHeight = altezzaCard + 'px';

        var margine = margineSuperiore();

        // Ancora nel flusso normale finche' non si supera il margine superiore
        if (colonnaFormRect.top >= margine) {
            return;
        }

        var fondoLista = colonnaLista.getBoundingClientRect().bottom;

        if (fondoLista - margine >= altezzaCard) {
            // C'e' ancora spazio sotto: il form segue lo scroll, fermo a "margine" dall'alto della finestra
            card.style.position = 'fixed';
            card.style.top = margine + 'px';
            card.style.left = rigaCard.left + 'px';
            card.style.width = larghezzaCard + 'px';
            return;
        }

        var topAssoluto = fondoLista - altezzaCard - colonnaFormRect.top;
        if (topAssoluto < 0) {
            // La lista e' piu' corta del form: resta nel flusso normale, senza inseguire lo scroll
            return;
        }

        // Si aggancia al fondo esatto dell'ultima card, mantenendo lo stesso rientro da sinistra
        card.style.position = 'absolute';
        card.style.top = topAssoluto + 'px';
        card.style.left = insetSinistro + 'px';
        card.style.width = larghezzaCard + 'px';
    }

    aggiorna();
    window.addEventListener('scroll', aggiorna, { passive: true });
    window.addEventListener('resize', aggiorna);
})();
