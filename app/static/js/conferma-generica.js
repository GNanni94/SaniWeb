// Sostituisce il window.confirm nativo di htmx (hx-confirm) con il modal
// "modalConfermaGenerica" per ogni elemento hx-* che ha l'attributo
// hx-confirm impostato, ovunque nel sito.
(function () {
    var modalEl = document.getElementById('modalConfermaGenerica');
    var testoEl = document.getElementById('testoConfermaGenerica');
    var btnConferma = document.getElementById('btnConfermaGenericaConferma');
    if (!modalEl || !testoEl || !btnConferma || typeof htmx === 'undefined') {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    var riprendiRichiesta = null;

    document.addEventListener('htmx:confirm', function (event) {
        if (!event.detail.question) {
            return;
        }
        event.preventDefault();
        testoEl.textContent = event.detail.question;
        btnConferma.textContent = event.detail.elt.dataset.confermaTesto || 'Elimina';
        btnConferma.className = 'btn rounded-pill px-4 ' + (event.detail.elt.dataset.confermaClasse || 'btn-danger');
        riprendiRichiesta = event.detail.issueRequest;
        modalBootstrap.show();
    });

    btnConferma.addEventListener('click', function () {
        modalBootstrap.hide();
        if (riprendiRichiesta) {
            riprendiRichiesta(true);
        }
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
        riprendiRichiesta = null;
    });
})();
