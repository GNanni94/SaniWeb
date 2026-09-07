// Modal di login: mostra il form di partials/form_login.html (lo stesso
// della pagina /login/ intera) senza navigare via dalla pagina corrente
(function () {
    var modalEl = document.getElementById('modalLogin');
    var modalBody = document.getElementById('modalLoginBody');
    if (!modalEl || !modalBody) {
        // Il modal non c'e' in questa pagina: il link "Login" in navbar naviga normalmente
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    var azioneInSospeso = null;

    window.mostraModalLogin = function (azioneDopoLogin) {
        azioneInSospeso = azioneDopoLogin || null;
        modalBootstrap.show();
    };

    document.addEventListener('click', function (event) {
        var link = event.target.closest('a[href="' + document.body.dataset.loginUrl + '"]');
        if (!link) {
            return;
        }
        event.preventDefault();
        window.mostraModalLogin(null);
    });

    // Delegazione sul body del modal: il form viene sostituito per intero ad ogni errore di validazione
    modalBody.addEventListener('submit', function (event) {
        var f = event.target.closest('#form-login');
        if (!f) {
            return;
        }
        event.preventDefault();

        // Blocca un secondo submit (es. doppio click su "Log In") mentre il primo e' ancora in volo
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
                    var mobileAnonimo = document.getElementById('navbarLoginRegistratiMobile');
                    var desktopAnonimo = document.getElementById('navbarLoginRegistratiDesktop');
                    if (mobileAnonimo) {
                        mobileAnonimo.remove();
                    }
                    if (desktopAnonimo) {
                        desktopAnonimo.remove();
                    }
                    document.getElementById('pillolaIconeUtente').insertAdjacentHTML('beforeend', html);

                    // django.contrib.auth.login() ruota il token CSRF: si ricopia il nuovo
                    // valore in ogni campo csrfmiddlewaretoken presente nella pagina
                    var nuovoTokenInput = document.querySelector('#pillolaIconeUtente input[name=csrfmiddlewaretoken]');
                    if (nuovoTokenInput) {
                        document.querySelectorAll('input[name=csrfmiddlewaretoken]').forEach(function (input) {
                            input.value = nuovoTokenInput.value;
                        });
                    }

                    modalBootstrap.hide();

                    var daRipetere = azioneInSospeso;
                    azioneInSospeso = null;
                    if (daRipetere) {
                        daRipetere();
                    }
                } else if (response.status === 400) {
                    // "html" e' il partial form_login.html ri-renderizzato con gli errori di validazione
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
