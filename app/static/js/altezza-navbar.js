// Espone l'altezza reale della navbar come custom property CSS
// "--altezza-navbar" sulla radice del documento
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

    // Ricalcola l'altezza quando il menu collassato da telefono/tablet si
    // apre o si chiude
    var menu = document.getElementById('navbarSupportedContent');
    if (menu) {
        menu.addEventListener('shown.bs.collapse', aggiornaAltezzaNavbar);
        menu.addEventListener('hidden.bs.collapse', aggiornaAltezzaNavbar);
    }
})();
