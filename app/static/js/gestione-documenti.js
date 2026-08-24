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
    var listaCategorie = document.getElementById('listaCategorieDocumenti');
    var numeroCategorie = document.getElementById('numeroCategorieDocumenti');
    var btnRinominaCategoria = document.getElementById('btnRinominaCategoria');
    var btnEliminaCategoria = document.getElementById('btnEliminaCategoria');
    var msgSeleziona = document.getElementById('messaggioSelezionaCategoria');
    var msgNessunoInCategoria = document.getElementById('messaggioNessunDocumentoCategoria');
    if (!tabellaContainer || !modalEl || !modalBody || !listaCategorie || !numeroCategorie || !msgSeleziona || !msgNessunoInCategoria) {
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

    // Token CSRF preso dal form del modal (sempre presente nel DOM, anche a
    // modal chiuso): serve anche alle richieste AJAX che non passano da
    // "form-documento" stesso, come la rinomina/eliminazione categoria
    function tokenCsrf() {
        var f = formCorrente();
        var tokenInput = f ? f.querySelector('[name=csrfmiddlewaretoken]') : null;
        return tokenInput ? tokenInput.value : null;
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

    // In modifica il file non e' sostituibile da qui: si mostra un link al
    // file gia' caricato al posto dell'input, disabilitato cosi' non viene
    // inviato col form (il server mantiene quello attuale, vedi
    // Pagine/forms.py, DocumentoForm.clean_file) e non blocca il submit con
    // la validazione HTML5 "required" del campo (i campi disabilitati non
    // vengono validati)
    function impostaCampoFileEsistente(f, url, nome) {
        var inputFile = f.elements['file'];
        var campoFile = document.getElementById('campoFile');
        var campoAttuale = document.getElementById('campoFileAttuale');
        var linkAttuale = document.getElementById('linkFileAttuale');
        if (!inputFile || !campoFile || !campoAttuale || !linkAttuale) {
            return;
        }
        inputFile.disabled = true;
        campoFile.classList.add('d-none');
        linkAttuale.href = url || '#';
        linkAttuale.textContent = nome || '';
        campoAttuale.classList.remove('d-none');
    }

    // null = nessuna categoria selezionata (stato iniziale, colonna destra
    // vuota); altrimenti stringa col pk della categoria attiva, stesso
    // formato di "riga.dataset.categoriaPk" (confronto per stringhe, mai
    // per numeri, in tutta questa funzione)
    var categoriaSelezionataPk = null;

    // null = modal in modalita' "nuovo documento"; altrimenti {url, nome}
    // del file del documento in modifica - serve a riapplicare
    // impostaCampoFileEsistente() dopo che un errore di validazione
    // sostituisce l'intero modalBody con un form fresco dal server (che non
    // sa nulla di questo stato solo-client), stesso motivo per cui anche
    // agganciaToggleCategoria() viene rieseguita li' sotto
    var fileAttualeInModifica = null;

    // null = nessuna categoria in rinomina; altrimenti l'elemento riga la
    // cui rinomina inline e' in corso - permette di annullarla (Esc, click
    // altrove, cambio di categoria selezionata) ripristinando testo/input
    // senza dover tracciare pk e nome originale separatamente
    var rigaCategoriaInRinomina = null;

    function annullaRinominaCategoria() {
        if (!rigaCategoriaInRinomina) {
            return;
        }
        var riga = rigaCategoriaInRinomina;
        rigaCategoriaInRinomina = null;
        var span = riga.querySelector('.testo-categoria');
        var input = riga.querySelector('.input-rinomina-categoria');
        if (span && input) {
            input.classList.add('d-none');
            span.classList.remove('d-none');
        }
    }

    // Filtro per categoria (colonna sinistra): mostra a destra solo i
    // documenti della categoria cliccata, lato client - stesso pattern gia'
    // usato per la ricerca in dashboard-prodotti-immagini.js. Gestisce
    // anche l'evidenziazione del bottone attivo, l'abilitazione di
    // Rinomina/Elimina (che agiscono sulla categoria qui selezionata,
    // vedi sotto) e i tre stati della colonna destra (nessuna categoria
    // scelta / categoria con documenti / categoria senza documenti)
    function applicaFiltroCategoria(pk) {
        annullaRinominaCategoria();
        categoriaSelezionataPk = pk;

        listaCategorie.querySelectorAll('[data-categoria-pk]').forEach(function (bottone) {
            bottone.classList.toggle('active', pk !== null && bottone.dataset.categoriaPk === pk);
        });
        if (btnRinominaCategoria) {
            btnRinominaCategoria.disabled = pk === null;
        }
        if (btnEliminaCategoria) {
            btnEliminaCategoria.disabled = pk === null;
        }

        if (pk === null) {
            tabellaContainer.classList.add('d-none');
            msgNessunoInCategoria.classList.add('d-none');
            msgSeleziona.classList.remove('d-none');
            return;
        }

        var visibili = 0;
        tabellaContainer.querySelectorAll('tr').forEach(function (riga) {
            var corrisponde = riga.dataset.categoriaPk === pk;
            riga.classList.toggle('d-none', !corrisponde);
            if (corrisponde) {
                visibili++;
            }
        });

        msgSeleziona.classList.add('d-none');
        tabellaContainer.classList.toggle('d-none', visibili === 0);
        msgNessunoInCategoria.classList.toggle('d-none', visibili !== 0);
    }

    listaCategorie.addEventListener('click', function (event) {
        if (event.target.closest('.input-rinomina-categoria')) {
            return;
        }
        var bottone = event.target.closest('[data-categoria-pk]');
        if (!bottone) {
            return;
        }
        applicaFiltroCategoria(bottone.dataset.categoriaPk);
    });

    // "div[role=button]" al posto di un vero bottone (vedi commento nel
    // template su "listaCategorieDocumenti"): tastiera Invio/Spazio deve
    // selezionare la riga come farebbe un bottone vero. Stessa
    // delegazione gestisce anche Invio/Esc dentro il campo di rinomina
    // inline (salva/annulla)
    listaCategorie.addEventListener('keydown', function (event) {
        var input = event.target.closest('.input-rinomina-categoria');
        if (input) {
            if (event.key === 'Enter') {
                event.preventDefault();
                salvaRinominaCategoria(input);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                annullaRinominaCategoria();
            }
            return;
        }
        var riga = event.target.closest('[data-categoria-pk]');
        if (riga && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            applicaFiltroCategoria(riga.dataset.categoriaPk);
        }
    });

    // "blur" non fa bubbling: la cattura (terzo argomento "true") intercetta
    // comunque l'uscita dal campo di rinomina, per click altrove (fuori
    // da "listaCategorie", es. sul modal Documento) o Tab - un click su
    // un'altra categoria e' gia' coperto anche da applicaFiltroCategoria
    // sopra, ma qui serve per i casi in cui non scatta
    listaCategorie.addEventListener('blur', function (event) {
        if (event.target.closest && event.target.closest('.input-rinomina-categoria')) {
            annullaRinominaCategoria();
        }
    }, true);

    function iniziaRinominaCategoria() {
        var riga = listaCategorie.querySelector('.list-group-item.active');
        if (!riga) {
            return;
        }
        var span = riga.querySelector('.testo-categoria');
        var input = riga.querySelector('.input-rinomina-categoria');
        if (!span || !input) {
            return;
        }
        rigaCategoriaInRinomina = riga;
        input.value = riga.dataset.nomeCategoria;
        span.classList.add('d-none');
        input.classList.remove('d-none');
        input.focus();
        input.select();
    }

    function salvaRinominaCategoria(input) {
        var riga = input.closest('[data-categoria-pk]');
        var nuovoNome = input.value.trim();
        if (!riga || !nuovoNome) {
            return;
        }
        var corpo = new FormData();
        corpo.append('nome_categoria', nuovoNome);
        var token = tokenCsrf();
        if (token) {
            corpo.append('csrfmiddlewaretoken', token);
        }
        fetch(riga.dataset.urlRinominaCategoria, {
            method: 'POST',
            body: corpo,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            if (response.status === 400) {
                // Nome vuoto o duplicato (Pagine/views.py, rinomina_categoria):
                // il campo resta in modifica cosi' l'utente puo' correggere,
                // niente sostituzione della tabella
                return response.json().then(function (data) {
                    window.alert(data.errore);
                });
            }
            return response.text().then(function (html) {
                rigaCategoriaInRinomina = null;
                if (response.ok) {
                    sostituisciTabella(html);
                } else {
                    window.location.reload();
                }
            });
        }).catch(function () {
            window.location.reload();
        });
    }

    function eliminaCategoriaSelezionata() {
        var riga = listaCategorie.querySelector('.list-group-item.active');
        if (!riga) {
            return;
        }
        var numeroSpan = riga.querySelector('.numero-documenti-categoria');
        var numDocumenti = numeroSpan ? (parseInt(numeroSpan.textContent, 10) || 0) : 0;
        var messaggio = numDocumenti > 0
            ? 'Eliminare la categoria "' + riga.dataset.nomeCategoria + '"? Verranno eliminati anche i ' + numDocumenti + ' documenti al suo interno.'
            : 'Eliminare la categoria "' + riga.dataset.nomeCategoria + '"?';
        if (!window.confirm(messaggio)) {
            return;
        }
        // La categoria selezionata sta per sparire: si torna allo stato
        // "nessuna categoria selezionata" invece di lasciare il filtro
        // puntato su un pk che dopo il refresh non esistera' piu'
        categoriaSelezionataPk = null;
        postConCsrfESostituisciTabella(riga.dataset.urlEliminaCategoria);
    }

    if (btnRinominaCategoria) {
        btnRinominaCategoria.addEventListener('click', function () {
            if (categoriaSelezionataPk !== null) {
                iniziaRinominaCategoria();
            }
        });
    }
    if (btnEliminaCategoria) {
        btnEliminaCategoria.addEventListener('click', function () {
            if (categoriaSelezionataPk !== null) {
                eliminaCategoriaSelezionata();
            }
        });
    }

    applicaFiltroCategoria(null);

    if (btnNuovo) {
        btnNuovo.addEventListener('click', function () {
            fileAttualeInModifica = null;
            modalBody.innerHTML = formInizialeHTML;
            agganciaToggleCategoria();
            // Precompila la categoria gia' selezionata a sinistra, se c'e'
            // (comodo per aggiungere piu' documenti di fila alla stessa
            // categoria)
            if (categoriaSelezionataPk !== null) {
                var f = formCorrente();
                if (f && f.elements['categoria']) {
                    f.elements['categoria'].value = categoriaSelezionataPk;
                    aggiornaVisibilitaCategoriaNuova(f);
                }
            }
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
            aggiornaVisibilitaCategoriaNuova(f);
            fileAttualeInModifica = { url: riga.dataset.fileUrl, nome: riga.dataset.nomeFile };
            impostaCampoFileEsistente(f, fileAttualeInModifica.url, fileAttualeInModifica.nome);
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

    // Riporta nello snapshot del form vuoto (usato da "+ Nuovo documento")
    // le stesse opzioni della select "categoria" appena ricevute dal
    // server: senza questo, una categoria creata al volo (campo "Nome
    // categoria" in form_documento.html) resterebbe invisibile li' finche'
    // non si ricarica l'intera pagina - lo snapshot e' catturato una sola
    // volta all'avvio (vedi sopra) e altrimenti non si aggiorna mai da solo
    function aggiornaOpzioniCategoriaNelFormVuoto(opzioniHTML) {
        var tmp = document.createElement('div');
        tmp.innerHTML = formInizialeHTML;
        var select = tmp.querySelector('#id_categoria');
        if (!select) {
            return;
        }
        select.innerHTML = opzioniHTML;
        formInizialeHTML = tmp.innerHTML;
    }

    // Ricalcola il numero sul badge dell'icona cartella contando i bottoni
    // categoria appena ricevuti, invece di leggerlo da un pezzo a parte
    // nella risposta del server - dopo listaCategorie.innerHTML = ... sopra
    // e' gia' tutto pronto per essere contato
    function aggiornaNumeroCategorie() {
        numeroCategorie.textContent = listaCategorie.querySelectorAll('[data-categoria-pk]').length;
    }

    function sostituisciTabella(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        var nuovoContenuto = tmp.querySelector('#tabella-documenti');
        var nuovaListaCategorie = tmp.querySelector('#listaCategorieDocumenti');
        if (!nuovoContenuto || !nuovaListaCategorie) {
            // Risposta inattesa (es. pagina di login intera): fallback a
            // un reload completo invece di lasciare la pagina incoerente
            window.location.reload();
            return;
        }
        tabellaContainer.innerHTML = nuovoContenuto.innerHTML;
        listaCategorie.innerHTML = nuovaListaCategorie.innerHTML;
        aggiornaNumeroCategorie();

        var opzioniCategoria = tmp.querySelector('#opzioniCategoriaAggiornate');
        if (opzioniCategoria) {
            aggiornaOpzioniCategoriaNelFormVuoto(opzioniCategoria.innerHTML);
        }

        // Ripristina lo stesso filtro attivo prima del refresh (o lo stato
        // "nessuna categoria selezionata"): righe/conteggi appena ricevuti
        // dal server sono comunque aggiornati, ma senza questo salvare o
        // eliminare un documento farebbe sparire il filtro che si stava
        // guardando
        applicaFiltroCategoria(categoriaSelezionataPk);
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
                    if (fileAttualeInModifica) {
                        impostaCampoFileEsistente(formCorrente(), fileAttualeInModifica.url, fileAttualeInModifica.nome);
                    }
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
        var corpo = new FormData();
        var token = tokenCsrf();
        if (token) {
            corpo.append('csrfmiddlewaretoken', token);
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
