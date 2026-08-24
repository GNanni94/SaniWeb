// Gestione documenti: apertura/precompilazione del pop-up e
// salvataggio/eliminazione via AJAX (fetch), senza ricaricare la pagina -
// stesso pattern di gestione-avvisi.js (header X-Requested-With, il
// server risponde con un frammento HTML che sostituisce quello esistente
// nella pagina)
(function () {
    var tabellaContainer = document.getElementById('tabella-documenti');
    var modalEl = document.getElementById('modalDocumento');
    var modalBody = document.getElementById('modalDocumentoBody');
    var btnNuovo = document.getElementById('btnNuovoDocumento');
    if (!tabellaContainer || !modalEl || !modalBody) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    // Snapshot del form vuoto (form_documento.html non compilato) cosi'
    // "+ Nuovo documento" puo' sempre ripartire da uno stato pulito, invece
    // di affidarsi a f.reset() - che dopo un errore di validazione
    // ripristinerebbe i valori (invalidi) appena sottomessi, non un form
    // vuoto, perche' il form ri-renderizzato dal server e' "bound"
    var formInizialeHTML = modalBody.innerHTML;

    function formCorrente() {
        return document.getElementById('form-documento');
    }

    // Il campo "Nuova categoria" serve solo quando la select e' sull'opzione
    // vuota ("+ Nuova categoria", vedi Pagine/forms.py) - altrimenti resta
    // nascosto, cosi' non si rischia di compilarlo per sbaglio insieme a
    // una categoria gia' scelta
    function aggiornaVisibilitaCategoriaNuova(f) {
        var select = f.elements['categoria'];
        var campo = document.getElementById('campoCategoriaNuova');
        if (!select || !campo) {
            return;
        }
        campo.classList.toggle('d-none', select.value !== '');
    }

    function agganciaToggleCategoria() {
        var f = formCorrente();
        if (!f || !f.elements['categoria']) {
            return;
        }
        aggiornaVisibilitaCategoriaNuova(f);
        f.elements['categoria'].addEventListener('change', function () {
            aggiornaVisibilitaCategoriaNuova(f);
        });
    }

    if (btnNuovo) {
        btnNuovo.addEventListener('click', function () {
            modalBody.innerHTML = formInizialeHTML;
            agganciaToggleCategoria();
        });
    }
    agganciaToggleCategoria();

    // Delegazione sul container della tabella: funziona anche sulle righe
    // rigenerate dopo ogni swap di innerHTML, senza dover ri-agganciare
    // l'evento ogni volta
    tabellaContainer.addEventListener('click', function (event) {
        var btnModifica = event.target.closest('.btn-modifica-documento');
        if (btnModifica) {
            var riga = btnModifica.closest('tr');
            var f = formCorrente();
            if (!f || !riga) {
                return;
            }
            f.action = btnModifica.dataset.urlModifica;
            f.elements['nome_file'].value = riga.dataset.nomeFile;
            f.elements['categoria'].value = riga.dataset.categoriaPk;
            // Il campo file non si puo' precompilare (i browser non lo
            // permettono per motivi di sicurezza): resta vuoto, e se non
            // viene toccato il documento mantiene il file gia' caricato
            // (vedi Pagine/forms.py, DocumentoForm.clean_file)
            aggiornaVisibilitaCategoriaNuova(f);
            modalBootstrap.show();
            return;
        }
        var btnElimina = event.target.closest('.btn-elimina-documento');
        if (btnElimina) {
            if (!window.confirm('Eliminare questo documento?')) {
                return;
            }
            postConCsrfESostituisciTabella(btnElimina.dataset.urlElimina);
        }
    });

    // Delegazione sul body del modal (non sul form direttamente): il form
    // viene sostituito per intero ad ogni errore di validazione, un
    // listener agganciato all'elemento vecchio andrebbe perso
    modalBody.addEventListener('submit', function (event) {
        var f = event.target.closest('#form-documento');
        if (!f) {
            return;
        }
        event.preventDefault();
        salvaDocumento(f);
    });

    function sostituisciTabella(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        var nuovoContenuto = tmp.firstElementChild;
        if (!nuovoContenuto || nuovoContenuto.id !== 'tabella-documenti') {
            // Risposta inattesa (es. pagina di login intera): fallback a
            // un reload completo invece di lasciare la pagina incoerente
            window.location.reload();
            return;
        }
        tabellaContainer.innerHTML = nuovoContenuto.innerHTML;
    }

    function salvaDocumento(f) {
        fetch(f.action, {
            method: 'POST',
            body: new FormData(f),
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (response.ok) {
                    sostituisciTabella(html);
                    modalBootstrap.hide();
                } else if (response.status === 400) {
                    // "html" qui e' gia' il partial form_documento.html con
                    // gli errori: sostituisce il contenuto del modal, che
                    // resta aperto
                    modalBody.innerHTML = html;
                    agganciaToggleCategoria();
                } else {
                    // Qualunque altro errore (403 CSRF scaduto, 404, 500,
                    // ...) non porta un frammento form_documento.html
                    // affidabile: iniettarlo nel modal lo romperebbe. Un
                    // reload riporta l'utente a uno stato coerente.
                    window.location.reload();
                }
            });
        }).catch(function () {
            window.location.reload();
        });
    }

    function postConCsrfESostituisciTabella(url) {
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
                } else {
                    // Richiesta fallita (record gia' rimosso da un'altra
                    // scheda, permessi scaduti, errore server...): un
                    // reload mostra lo stato reale invece di lasciare la
                    // pagina senza alcun feedback
                    window.location.reload();
                }
            });
        }).catch(function () {
            window.location.reload();
        });
    }
})();
