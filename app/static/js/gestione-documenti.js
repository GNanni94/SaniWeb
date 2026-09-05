// Gestione documenti: apertura/precompilazione del pop-up, salvataggio/
// eliminazione di documenti e categorie via AJAX (fetch), caricamento
// dell'anteprima PDF nel pannello destro - senza mai ricaricare la
// pagina. Stesso pattern di gestione-avvisi.js (header X-Requested-With,
// il server risponde con un frammento HTML che sostituisce quello
// esistente nella pagina). Il vecchio filtro per categoria (tabella
// piatta + colonna categorie separata) e' sparito: l'albero
// (partials/albero_documenti.html) mostra sempre tutte le cartelle,
// aperte/chiuse una alla volta via accordion Bootstrap nativo
// (data-bs-toggle="collapse").
(function () {
    var albero = document.getElementById('albero-documenti');
    var anteprima = document.getElementById('anteprima-documento');
    var modalEl = document.getElementById('modalDocumento');
    var modalBody = document.getElementById('modalDocumentoBody');
    var btnNuovo = document.getElementById('btnNuovoDocumento');
    if (!albero || !anteprima || !modalEl || !modalBody) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    // Snapshot del form vuoto (form_documento.html non compilato) cosi'
    // "+ Nuovo documento" puo' sempre ripartire da uno stato pulito, invece
    // di affidarsi a f.reset() - che dopo un errore di validazione
    // ripristinerebbe i valori (invalidi) appena sottomessi, non un form
    // vuoto, perche' il form ri-renderizzato dal server e' "bound"
    var formInizialeHTML = modalBody.innerHTML;
    // Snapshot del messaggio iniziale del pannello anteprima
    // (gestione_documenti.html): usato per tornarvi quando il documento
    // in anteprima viene eliminato (vedi sostituisciAlbero)
    var anteprimaInizialeHTML = anteprima.innerHTML;

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

    // null = modal in modalita' "nuovo documento"; altrimenti {url, nome}
    // del file del documento in modifica - serve a riapplicare
    // impostaCampoFileEsistente() dopo che un errore di validazione
    // sostituisce l'intero modalBody con un form fresco dal server (che non
    // sa nulla di questo stato solo-client), stesso motivo per cui anche
    // agganciaToggleCategoria() viene rieseguita li' sotto
    var fileAttualeInModifica = null;

    // null = nessuna categoria in rinomina; altrimenti l'"accordion-item"
    // (l'intero blocco cartella, non solo l'intestazione) la cui rinomina
    // inline e' in corso - permette di annullarla (Esc, click altrove)
    // ripristinando testo/input senza dover tracciare pk e nome originale
    // separatamente
    var rigaCategoriaInRinomina = null;

    // Legge dal DOM quale cartella e' attualmente aperta (al piu' una,
    // l'accordion Bootstrap le chiude a vicenda via "data-bs-parent"):
    // ".accordion-button:not(.collapsed)" e' la classe che Bootstrap
    // stesso toglie/mette sul div di intestazione quando il collapse
    // collegato si apre/chiude
    function cartellaApertaPk() {
        var bottoneAperto = albero.querySelector('.accordion-button:not(.collapsed)');
        if (!bottoneAperto) {
            return null;
        }
        var item = bottoneAperto.closest('[data-categoria-pk]');
        return item ? item.dataset.categoriaPk : null;
    }

    // Riapplica lo stato "aperta" a una cartella dopo un refresh AJAX
    // (il markup fresco dal server arriva sempre tutto chiuso): imposta
    // direttamente le classi che Bootstrap stesso userebbe, senza bisogno
    // di istanziare bootstrap.Collapse a mano - Bootstrap crea l'istanza
    // pigra al primo click successivo, leggendo lo stato dalle classi gia'
    // presenti nel DOM in quel momento
    function riapriCartella(pk) {
        var corpo = document.getElementById('corpoCartella' + pk);
        var item = document.getElementById('cartella-' + pk);
        if (!corpo || !item) {
            return;
        }
        var bottone = item.querySelector('.accordion-button');
        corpo.classList.add('show');
        if (bottone) {
            bottone.classList.remove('collapsed');
            bottone.setAttribute('aria-expanded', 'true');
        }
    }

    function annullaRinominaCategoria() {
        if (!rigaCategoriaInRinomina) {
            return;
        }
        var item = rigaCategoriaInRinomina;
        rigaCategoriaInRinomina = null;
        var span = item.querySelector('.testo-categoria');
        var input = item.querySelector('.input-rinomina-categoria');
        if (span && input) {
            input.classList.add('d-none');
            span.classList.remove('d-none');
        }
    }

    function iniziaRinominaCategoria(pk) {
        var item = document.getElementById('cartella-' + pk);
        if (!item) {
            return;
        }
        var span = item.querySelector('.testo-categoria');
        var input = item.querySelector('.input-rinomina-categoria');
        if (!span || !input) {
            return;
        }
        rigaCategoriaInRinomina = item;
        input.value = item.dataset.nomeCategoria;
        span.classList.add('d-none');
        input.classList.remove('d-none');
        input.focus();
        input.select();
    }

    function salvaRinominaCategoria(input) {
        var item = input.closest('[data-categoria-pk]');
        var nuovoNome = input.value.trim();
        if (!item || !nuovoNome) {
            return;
        }
        var corpo = new FormData();
        corpo.append('nome_categoria', nuovoNome);
        var token = tokenCsrf();
        if (token) {
            corpo.append('csrfmiddlewaretoken', token);
        }
        fetch(item.dataset.urlRinominaCategoria, {
            method: 'POST',
            body: corpo,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            if (response.status === 400) {
                // Nome vuoto o duplicato (Pagine/views.py,
                // rinomina_categoria): il campo resta in modifica cosi'
                // l'utente puo' correggere, niente sostituzione dell'albero
                return response.json().then(function (data) {
                    window.alert(data.errore);
                });
            }
            return response.text().then(function (html) {
                rigaCategoriaInRinomina = null;
                if (response.ok) {
                    sostituisciAlbero(html);
                } else {
                    window.location.reload();
                }
            });
        }).catch(function () {
            window.location.reload();
        });
    }

    function eliminaCategoria(item) {
        var numeroSpan = item.querySelector('.numero-documenti-categoria');
        var numDocumenti = numeroSpan ? (parseInt(numeroSpan.textContent, 10) || 0) : 0;
        var messaggio = numDocumenti > 0
            ? 'Eliminare la categoria "' + item.dataset.nomeCategoria + '"? Verranno eliminati anche i ' + numDocumenti + ' documenti al suo interno.'
            : 'Eliminare la categoria "' + item.dataset.nomeCategoria + '"?';
        if (!window.confirm(messaggio)) {
            return;
        }
        postConCsrfESostituisciAlbero(item.dataset.urlEliminaCategoria);
    }

    // Fetch GET (nessun CSRF necessario) verso l'endpoint di sola lettura
    // anteprima_documento (Pagine/views.py): inietta il PDF nel pannello
    // destro ed evidenzia la riga cliccata, rimuovendo l'evidenziazione
    // dalla precedente
    function mostraAnteprimaDocumento(pk, url) {
        if (!url) {
            return;
        }
        fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (!response.ok) {
                    // pk non piu' valido (es. eliminato da un'altra
                    // scheda) o altro errore imprevisto: un reload mostra
                    // lo stato reale
                    window.location.reload();
                    return;
                }
                if (window.Idiomorph) {
                    Idiomorph.morph(anteprima, html, { morphStyle: 'innerHTML' });
                } else {
                    anteprima.innerHTML = html;
                }
                albero.querySelectorAll('.list-group-item.active').forEach(function (r) {
                    r.classList.remove('active');
                });
                var rigaCliccata = document.getElementById('documento-riga-' + pk);
                if (rigaCliccata) {
                    rigaCliccata.classList.add('active');
                }
            });
        }).catch(function () {
            window.location.reload();
        });
    }

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

    function sostituisciAlbero(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        var nuovoContenuto = tmp.querySelector('#albero-documenti');
        if (!nuovoContenuto) {
            // Risposta inattesa (es. pagina di login intera): fallback a
            // un reload completo invece di lasciare la pagina incoerente
            window.location.reload();
            return;
        }

        // Stato puramente client-side, letto dal vivo dal DOM PRIMA dello
        // swap (il markup fresco dal server non sa cosa fosse aperto/in
        // anteprima prima del refresh)
        var pkCartellaAperta = cartellaApertaPk();
        var rigaAttiva = albero.querySelector('.list-group-item.active');
        var pkDocumentoInAnteprima = rigaAttiva ? rigaAttiva.dataset.pk : null;

        // Idiomorph (base.html) preserva le cartelle/righe invariate
        // invece di ricrearle tutte - stesso motivo/test di
        // carrello-flottante.js. Fallback al vecchio innerHTML se la
        // libreria non risultasse caricata
        if (window.Idiomorph) {
            Idiomorph.morph(albero, nuovoContenuto.innerHTML, { morphStyle: 'innerHTML' });
        } else {
            albero.innerHTML = nuovoContenuto.innerHTML;
        }

        var opzioniCategoria = tmp.querySelector('#opzioniCategoriaAggiornate');
        if (opzioniCategoria) {
            aggiornaOpzioniCategoriaNelFormVuoto(opzioniCategoria.innerHTML);
        }

        // Ripristina la stessa cartella aperta prima del refresh, se
        // esiste ancora
        if (pkCartellaAperta !== null) {
            riapriCartella(pkCartellaAperta);
        }

        // Ripristina l'evidenziazione del documento in anteprima se esiste
        // ancora; altrimenti (appena eliminato, oppure la sua cartella e'
        // stata eliminata a cascata) il pannello torna al messaggio
        // iniziale
        if (pkDocumentoInAnteprima !== null) {
            var rigaAncoraPresente = document.getElementById('documento-riga-' + pkDocumentoInAnteprima);
            if (rigaAncoraPresente) {
                rigaAncoraPresente.classList.add('active');
            } else {
                anteprima.innerHTML = anteprimaInizialeHTML;
            }
        }
    }

    function salvaDocumento(f) {
        fetch(f.action, {
            method: 'POST',
            body: new FormData(f),
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (response.ok) {
                    sostituisciAlbero(html);
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

    function postConCsrfESostituisciAlbero(url) {
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
                    sostituisciAlbero(html);
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

    agganciaToggleCategoria();

    if (btnNuovo) {
        btnNuovo.addEventListener('click', function () {
            fileAttualeInModifica = null;
            modalBody.innerHTML = formInizialeHTML;
            agganciaToggleCategoria();
            // Precompila la categoria della cartella aperta, se c'e'
            // (comodo per aggiungere piu' documenti di fila alla stessa
            // cartella)
            var pkCartellaAperta = cartellaApertaPk();
            if (pkCartellaAperta !== null) {
                var f = formCorrente();
                if (f && f.elements['categoria']) {
                    f.elements['categoria'].value = pkCartellaAperta;
                    aggiornaVisibilitaCategoriaNuova(f);
                }
            }
        });
    }

    // Delegazione sul container dell'albero: funziona anche sulle
    // cartelle/righe rigenerate dopo ogni swap di innerHTML, senza dover
    // ri-agganciare l'evento ogni volta
    albero.addEventListener('click', function (event) {
        if (event.target.closest('.input-rinomina-categoria')) {
            // Impedisce che un click nel campo di rinomina apra/chiuda la
            // cartella per sbaglio: il div dell'intestazione ha
            // "data-bs-toggle=collapse" e Bootstrap intercetta i click su
            // "document" - "stopPropagation" qui impedisce alla richiesta
            // di arrivarci, senza toccare il comportamento nativo
            // dell'input (focus, selezione testo)
            event.stopPropagation();
            return;
        }

        var btnRinominaCategoria = event.target.closest('.btn-rinomina-categoria');
        if (btnRinominaCategoria) {
            var itemRinomina = btnRinominaCategoria.closest('[data-categoria-pk]');
            if (itemRinomina) {
                iniziaRinominaCategoria(itemRinomina.dataset.categoriaPk);
            }
            return;
        }

        var btnEliminaCategoria = event.target.closest('.btn-elimina-categoria');
        if (btnEliminaCategoria) {
            var itemElimina = btnEliminaCategoria.closest('[data-categoria-pk]');
            if (itemElimina) {
                eliminaCategoria(itemElimina);
            }
            return;
        }

        var btnModificaDocumento = event.target.closest('.btn-modifica-documento');
        if (btnModificaDocumento) {
            var riga = btnModificaDocumento.closest('[data-pk]');
            var f = formCorrente();
            if (!f || !riga) {
                return;
            }
            f.action = btnModificaDocumento.dataset.urlModifica;
            f.elements['nome_file'].value = riga.dataset.nomeFile;
            f.elements['categoria'].value = riga.dataset.categoriaPk;
            aggiornaVisibilitaCategoriaNuova(f);
            fileAttualeInModifica = { url: riga.dataset.fileUrl, nome: riga.dataset.nomeFile };
            impostaCampoFileEsistente(f, fileAttualeInModifica.url, fileAttualeInModifica.nome);
            modalBootstrap.show();
            return;
        }

        var btnEliminaDocumento = event.target.closest('.btn-elimina-documento');
        if (btnEliminaDocumento) {
            if (!window.confirm('Eliminare questo documento?')) {
                return;
            }
            postConCsrfESostituisciAlbero(btnEliminaDocumento.dataset.urlElimina);
            return;
        }

        var btnNomeDocumento = event.target.closest('.documento-nome-btn');
        if (btnNomeDocumento) {
            var rigaDocumento = btnNomeDocumento.closest('[data-pk]');
            if (rigaDocumento) {
                mostraAnteprimaDocumento(rigaDocumento.dataset.pk, rigaDocumento.dataset.urlAnteprima);
            }
        }
    });

    // "div[role=button]" al posto di un vero bottone (vedi commento nel
    // template su "accordion-button"): tastiera Invio/Spazio deve aprire/
    // chiudere la cartella come farebbe un bottone vero - un vero <button>
    // otterrebbe questo comportamento gratis dal browser, un <div> no.
    // Stessa delegazione gestisce anche Invio/Esc dentro il campo di
    // rinomina inline (salva/annulla)
    albero.addEventListener('keydown', function (event) {
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
        var bottoneCartella = event.target.closest('.accordion-button');
        if (bottoneCartella && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            bottoneCartella.click();
        }
    });

    // "blur" non fa bubbling: la cattura (terzo argomento "true") intercetta
    // comunque l'uscita dal campo di rinomina, per click altrove (fuori
    // da "albero", es. sul modal Documento) o Tab
    albero.addEventListener('blur', function (event) {
        if (event.target.closest && event.target.closest('.input-rinomina-categoria')) {
            annullaRinominaCategoria();
        }
    }, true);

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
})();
