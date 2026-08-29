// Espone l'altezza reale della navbar (".site-navbar" in base.html, comune a
// tutto il sito) come custom property CSS "--altezza-navbar" sulla radice
// del documento: disponibile per pagine che vogliano posizionare propri
// elementi fissati subito sotto di lei durante lo scroll, senza dover
// ricalcolare/duplicare quel valore a mano - la navbar non ha un'altezza
// fissa dichiarata altrove (dipende da logo/padding/eventuale menu aperto)
(function () {
    var navbar = document.querySelector('.site-navbar');
    if (!navbar) {
        return;
    }

    function aggiornaAltezzaNavbar() {
        document.documentElement.style.setProperty('--altezza-navbar', navbar.offsetHeight + 'px');
    }

    aggiornaAltezzaNavbar();
    window.addEventListener('resize', aggiornaAltezzaNavbar);

    // Il menu collassato da telefono/tablet (sotto xxl, vedi
    // "navbar-expand-xxl" in base.html) cambia l'altezza della navbar
    // quando si apre/chiude (il menu e' dentro <nav>, non sovrapposto) -
    // "shown.bs.collapse"/"hidden.bs.collapse" sono gli eventi Bootstrap
    // emessi dal pannello stesso a transizione finita
    var menu = document.getElementById('navbarSupportedContent');
    if (menu) {
        menu.addEventListener('shown.bs.collapse', aggiornaAltezzaNavbar);
        menu.addEventListener('hidden.bs.collapse', aggiornaAltezzaNavbar);
    }
})();
