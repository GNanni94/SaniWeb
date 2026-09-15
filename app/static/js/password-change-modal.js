// Modal di cambio password: mostra il form di partials/form_cambio_password.html
// (lo stesso della pagina /cliente/password_change/ intera) senza navigare via
// dalla pagina corrente
(function () {
    var modalEl = document.getElementById('modalCambioPassword');
    var modalBody = document.getElementById('modalCambioPasswordBody');
    if (!modalEl || !modalBody) {
        // Il modal non c'e' in questa pagina: il link "Cambia password" naviga normalmente
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);

    document.addEventListener('click', function (event) {
        var link = event.target.closest('a[href="' + document.body.dataset.passwordChangeUrl + '"]');
        if (!link) {
            return;
        }
        event.preventDefault();
        modalBootstrap.show();
    });

    // Delegazione sul body del modal: il form viene sostituito per intero ad ogni errore di validazione
    modalBody.addEventListener('submit', function (event) {
        var f = event.target.closest('#form-cambia-password');
        if (!f) {
            return;
        }
        event.preventDefault();

        // Blocca un secondo submit mentre il primo e' ancora in volo
        var bottoneSubmit = f.querySelector('button[type=submit]');
        if (bottoneSubmit) {
            bottoneSubmit.disabled = true;
        }

        fetch(f.action, {
            method: 'POST',
            body: new FormData(f),
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (response.ok) {
                    // "html" e' partials/password_cambiata_successo.html
                    modalBody.innerHTML = html;
                } else if (response.status === 400) {
                    // "html" e' form_cambio_password.html ri-renderizzato con gli errori di validazione
                    modalBody.innerHTML = html;
                } else {
                    // Errore imprevisto (403 CSRF scaduto, 500, ...)
                    window.location.reload();
                }
            });
        }).catch(function () {
            // Fetch fallita per motivi di rete
            window.location.reload();
        });
    });
})();
