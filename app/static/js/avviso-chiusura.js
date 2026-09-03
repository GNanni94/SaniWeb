(function () {
    var banner = document.getElementById('avvisoChiusura');
    if (!banner) {
        return;
    }
    // Chiave diversa per "preavviso" e "chiusura": chiudere il banner
    // giallo prima dell'inizio della chiusura non deve sopprimere anche
    // quello rosso quando compare - sono due messaggi diversi
    var chiave = 'avvisoChiusuraChiuso-' + banner.dataset.avvisoFase;
    if (sessionStorage.getItem(chiave) === '1') {
        banner.remove();
        return;
    }
    banner.addEventListener('closed.bs.alert', function () {
        sessionStorage.setItem(chiave, '1');
    });
})();
