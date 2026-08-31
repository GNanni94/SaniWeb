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

        // Blocca un secondo submit mentre il primo e' ancora in volo (es.
        // doppio click su "Log In"): senza questo, il primo POST puo'
        // riuscire e ruotare il token CSRF (vedi sotto) mentre il secondo,
        // gia' partito con il token vecchio, arriva dopo e riceve un
        // errore imprevisto - vedi il ramo "else" qui sotto.
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

                    // django.contrib.auth.login() ruota il token CSRF
                    // (rotate_token()) come misura di sicurezza: prima di
                    // questa feature il login ricaricava sempre la pagina,
                    // quindi ogni form aveva sempre un token fresco. Ora un
                    // login nel popup, senza reload, lascia gli ALTRI form
                    // gia' presenti sulla pagina (es. il form messaggio di
                    // contatti.html, il widget di carrello_flottante.html)
                    // con il vecchio token, ormai invalido: un loro submit
                    // fallirebbe con 403. Il frammento appena inserito e'
                    // l'unico posto con il token gia' rinnovato, quindi lo
                    // si ricopia in ogni campo csrfmiddlewaretoken esistente.
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
                    // "html" e' il partial form_login.html ri-renderizzato
                    // con gli errori (crispy-forms li mostra gia' da solo,
                    // nessuna gestione JS aggiuntiva necessaria) - il form
                    // intero viene sostituito, quindi il suo bottone arriva
                    // gia' riabilitato, nessun reset esplicito necessario
                    modalBody.innerHTML = html;
                } else {
                    // Errore imprevisto (403 CSRF scaduto, 500, ...): un
                    // submit reale (f.submit()) rimanderebbe lo STESSO
                    // token, gia' noto per essere rifiutato - stesso
                    // principio gia' usato in gestione-avvisi.js
                    // (salvaAvviso(), ramo "else"): un reload riporta
                    // l'utente a uno stato coerente (auth/token freschi)
                    window.location.reload();
                }
            });
        }).catch(function () {
            // Fetch fallita per motivi di rete: stesso ragionamento del
            // ramo sopra, un reload e' l'unico modo sicuro di recuperare
            window.location.reload();
        });
    });
})();
