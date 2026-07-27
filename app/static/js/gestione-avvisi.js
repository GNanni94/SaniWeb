// Gestione avvisi di chiusura: apertura/precompilazione del pop-up e
// salvataggio/eliminazione via AJAX (fetch), senza ricaricare la pagina -
// stesso pattern di filtro-prodotti-ajax.js (header X-Requested-With, il
// server risponde con un frammento HTML che sostituisce quello esistente
// nella pagina)
(function () {
    var tabellaContainer = document.getElementById('tabella-avvisi');
    var modalEl = document.getElementById('modalAvviso');
    var modalBody = document.getElementById('modalAvvisoBody');
    var btnNuovo = document.getElementById('btnNuovoAvviso');
    if (!tabellaContainer || !modalEl || !modalBody) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);

    function formCorrente() {
        return document.getElementById('form-avviso');
    }

    if (btnNuovo) {
        btnNuovo.addEventListener('click', function () {
            var f = formCorrente();
            if (!f) {
                return;
            }
            f.reset();
            f.action = f.dataset.azioneNuovo;
        });
    }

    // Delegazione sul container della tabella: funziona anche sulle righe
    // rigenerate dopo ogni swap di innerHTML, senza dover ri-agganciare
    // l'evento ogni volta
    tabellaContainer.addEventListener('click', function (event) {
        var btnModifica = event.target.closest('.btn-modifica-avviso');
        if (btnModifica) {
            var riga = btnModifica.closest('tr');
            var f = formCorrente();
            if (!f || !riga) {
                return;
            }
            f.action = btnModifica.dataset.urlModifica;
            f.elements['data_inizio'].value = riga.dataset.dataInizio;
            f.elements['data_fine'].value = riga.dataset.dataFine;
            f.elements['motivo_chiusura'].value = riga.dataset.motivo;
            f.elements['attivo'].checked = riga.dataset.attivo === 'true';
            modalBootstrap.show();
            return;
        }
        var btnElimina = event.target.closest('.btn-elimina-avviso');
        if (btnElimina) {
            if (!window.confirm('Eliminare questo avviso?')) {
                return;
            }
            eliminaAvviso(btnElimina.dataset.urlElimina);
        }
    });

    // Delegazione sul body del modal (non sul form direttamente): il form
    // viene sostituito per intero ad ogni errore di validazione, un
    // listener agganciato all'elemento vecchio andrebbe perso
    modalBody.addEventListener('submit', function (event) {
        var f = event.target.closest('#form-avviso');
        if (!f) {
            return;
        }
        event.preventDefault();
        salvaAvviso(f);
    });

    function sostituisciTabella(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        var nuovoContenuto = tmp.firstElementChild;
        if (!nuovoContenuto || nuovoContenuto.id !== 'tabella-avvisi') {
            // Risposta inattesa (es. pagina di login intera): fallback a
            // un reload completo invece di lasciare la pagina incoerente
            window.location.reload();
            return;
        }
        tabellaContainer.innerHTML = nuovoContenuto.innerHTML;
    }

    function salvaAvviso(f) {
        fetch(f.action, {
            method: 'POST',
            body: new FormData(f),
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (response.ok) {
                    sostituisciTabella(html);
                    modalBootstrap.hide();
                } else {
                    // "html" qui e' gia' il partial form_avviso.html con
                    // gli errori: sostituisce il contenuto del modal, che
                    // resta aperto
                    modalBody.innerHTML = html;
                }
            });
        }).catch(function () {
            window.location.reload();
        });
    }

    function eliminaAvviso(url) {
        var f = formCorrente();
        var corpo = new FormData();
        var tokenInput = f ? f.querySelector('[name=csrfmiddlewaretoken]') : null;
        if (tokenInput) {
            corpo.append('csrfmiddlewaretoken', tokenInput.value);
        }
        fetch(url, {
            method: 'POST',
            body: corpo,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (response.ok) {
                    sostituisciTabella(html);
                }
            });
        }).catch(function () {
            window.location.reload();
        });
    }
})();
