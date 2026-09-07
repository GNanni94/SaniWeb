(function () {
    var banner = document.getElementById('avvisoChiusura');
    if (!banner) {
        return;
    }
    // Chiave di sessionStorage separata per "preavviso" e "chiusura": i due
    // banner si nascondono in modo indipendente
    var chiave = 'avvisoChiusuraChiuso-' + banner.dataset.avvisoFase;
    if (sessionStorage.getItem(chiave) === '1') {
        banner.remove();
        return;
    }
    banner.addEventListener('closed.bs.alert', function () {
        sessionStorage.setItem(chiave, '1');
    });
})();
