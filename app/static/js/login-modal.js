// Popup di login: sostituisce la navigazione a pagina intera verso
// "/login/" per i due trigger che un utente anonimo puo' incontrare sul
// sito (click su "Login" in navbar, azione che risponde 401 - vedi
// aggiungi-al-carrello.js). Il form vero e proprio (partials/form_login.html)
// e' lo stesso della pagina /login/ intera, che resta il fallback per
// accesso diretto/bookmark e per submit senza JS.
(function () {
    var modalEl = document.getElementById('modalLogin');
    var modalBody = document.getElementById('modalLoginBody');
    if (!modalEl || !modalBody) {
        // Pagina "/login/" stessa: il modal non c'e' (vedi base.html),
        // il link "Login" in navbar naviga normalmente
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

    // Delegazione sul body del modal (non sul form direttamente): il
    // form viene sostituito per intero ad ogni errore di validazione,
    // un listener agganciato all'elemento vecchio andrebbe perso -
    // stesso principio gia' usato in gestione-avvisi.js
    modalBody.addEventListener('submit', function (event) {
        var f = event.target.closest('#form-login');
        if (!f) {
            return;
        }
        event.preventDefault();

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
                    modalBootstrap.hide();

                    var daRipetere = azioneInSospeso;
                    azioneInSospeso = null;
                    if (daRipetere) {
                        daRipetere();
                    }
                } else if (response.status === 400) {
                    // "html" e' il partial form_login.html ri-renderizzato
                    // con gli errori (crispy-forms li mostra gia' da solo,
                    // nessuna gestione JS aggiuntiva necessaria)
                    modalBody.innerHTML = html;
                } else {
                    // Errore imprevisto (403 CSRF scaduto, 500, ...): un
                    // submit reale riporta l'utente a uno stato coerente
                    f.submit();
                }
            });
        }).catch(function () {
            f.submit();
        });
    });
})();
