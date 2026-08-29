// Riga titolo/filtro/ricerca fissata in cima allo scroll da desktop, subito
// sotto alla navbar (anche lei fissata, vedi altezza-navbar.js/
// ".site-navbar" in navbar.css - ".intestazione-categoria-sticky" in
// prodotti.css, "position: sticky" di suo): grazie a "#sentinellaIntestazione"
// (altezza vera, vedi il commento nel template che la usa) la riga scorre
// normalmente insieme al resto della pagina per un tratto, e si aggancia
// solo quando la navbar la raggiunge davvero - esattamente li' si aggiunge
// ".intestazione-fissata" (bordo/pillola in prodotti.css), osservando
// quando la sentinella esce dalla vista scrollando verso il basso.
// "rootMargin" ridotto dell'altezza della navbar: senza, l'osservatore la
// considera "ancora visibile" (quindi riga non ancora agganciata) finche'
// non esce dal tutto in cima allo schermo (y=0), invece del punto vero in
// cui la riga si aggancia (y=altezza navbar, la navbar sopra di lei la
// copre gia' da li')
//
// Condiviso tra prodotti_card.html e prodotti_tabella.html (entrambi
// passano "intestazione_sticky=True" a "partials/intestazione_categoria.html"
// e includono questo stesso script): nessun riferimento a markup specifico
// di una sola delle due pagine, solo gli id/classi generici qui sopra.
(function () {
    var sentinella = document.getElementById('sentinellaIntestazione');
    var riga = document.querySelector('.intestazione-categoria-sticky');
    var navbar = document.querySelector('.site-navbar');
    if (sentinella && riga && 'IntersectionObserver' in window) {
        var altezzaNavbar = navbar ? navbar.offsetHeight : 0;
        new IntersectionObserver(function (entries) {
            riga.classList.toggle('intestazione-fissata', !entries[0].isIntersecting);
        }, { rootMargin: '-' + altezzaNavbar + 'px 0px 0px 0px' }).observe(sentinella);
    }
})();
