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
    var btnRinominaCategoria = document.getElementById('btnRinominaCategoria');
    var btnEliminaCategoria = document.getElementById('btnEliminaCategoria');
    var wrapperAzioniCategoria = document.querySelector('.pannello-documenti-azioni-categoria');
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
    // (gestione_documenti.html): usato per tornarci quando il documento
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

    // Riga del documento correntemente in anteprima (".active", vedi
    // mostraAnteprimaDocumento) - valida solo se la sua cartella e'
    // ancora aperta: chiudendo la cartella la riga resta "active" nel DOM
    // (il collapse la nasconde soltanto via CSS) ma i bottoni fissi non
    // devono restare agganciati a un documento che non si vede piu'
    function documentoSelezionatoAttivo() {
        var riga = albero.querySelector('.list-group-item.active');
        if (!riga) {
            return null;
        }
        var corpo = riga.closest('.accordion-collapse');
        return (corpo && corpo.classList.contains('show')) ? riga : null;
    }

    // Rinomina/Elimina categoria (bottoni fissi sul contorno del riquadro,
    // vedi partials/albero_documenti.html) agiscono sul documento
    // selezionato se ce n'e' uno, altrimenti sulla cartella correntemente
    // aperta - disabilitati se non c'e' ne' l'uno ne' l'altro. Richiamata
    // dopo ogni apertura/chiusura reale (eventi Bootstrap
    // "shown.bs.collapse"/"hidden.bs.collapse", vedi sotto), dopo ogni
    // riapertura sintetica via riapriCartella() (che non passa da
    // bootstrap.Collapse quindi non genera quegli eventi) e dopo ogni
    // cambio di documento in anteprima (mostraAnteprimaDocumento)
    function aggiornaBottoniAzione() {
        var riga = documentoSelezionatoAttivo();
        var pkCategoria = cartellaApertaPk();
        var nessunaSelezione = !riga && pkCategoria === null;
        if (wrapperAzioniCategoria) {
            // "azioni-categoria-nascosta" invece di "d-none": stessa
            // funzione (nascosti del tutto, ne' cliccabili ne'
            // raggiungibili da tastiera - "disabled" sui due bottoni,
            // gestito qui in passato, era ridondante ed e' stato tolto
            // insieme all'attributo "disabled" nel template) ma
            // transizionabile in altezza/opacita' (vedi documenti.css),
            // "display" non lo e'
            wrapperAzioniCategoria.classList.toggle('azioni-categoria-nascosta', nessunaSelezione);
        }
        if (btnRinominaCategoria) {
            btnRinominaCategoria.title = riga ? 'Modifica documento' : 'Rinomina categoria';
            btnRinominaCategoria.setAttribute('aria-label', btnRinominaCategoria.title);
        }
        if (btnEliminaCategoria) {
            btnEliminaCategoria.title = riga ? 'Elimina documento' : 'Elimina categoria';
            btnEliminaCategoria.setAttribute('aria-label', btnEliminaCategoria.title);
        }
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
        var bottone = item.querySelector('.accordion-button');
        var input = item.querySelector('.input-rinomina-categoria');
        if (bottone && input) {
            input.classList.add('d-none');
            bottone.classList.remove('d-none');
        }
    }

    function iniziaRinominaCategoria(pk) {
        var item = document.getElementById('cartella-' + pk);
        if (!item) {
            return;
        }
        // Nasconde l'intero bottone (non solo ".testo-categoria"), badge
        // compreso: l'input e' un suo fratello nell'intestazione (mai
        // annidato dentro di lui, vedi commento nel template), quindi per
        // farlo comparire "al centro dove sta il titolo" serve toglierlo
        // di mezzo del tutto, non solo nascondere il testo
        var bottone = item.querySelector('.accordion-button');
        var input = item.querySelector('.input-rinomina-categoria');
        if (!bottone || !input) {
            return;
        }
        rigaCategoriaInRinomina = item;
        input.value = item.dataset.nomeCategoria;
        bottone.classList.add('d-none');
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

    // Apre il modal precompilato per modificare "riga" (l'elemento
    // "[data-pk]" di un documento): niente piu' matita per riga (rimossa,
    // vedi albero_documenti.html), solo il bottone fisso in cima quando
    // questo e' il documento selezionato (vedi documentoSelezionatoAttivo/
    // aggiornaBottoniAzione) - "data-url-modifica" e' sulla riga stessa
    function apriModalModificaDocumento(riga) {
        var f = formCorrente();
        if (!f) {
            return;
        }
        f.action = riga.dataset.urlModifica;
        f.elements['nome_file'].value = riga.dataset.nomeFile;
        f.elements['categoria'].value = riga.dataset.categoriaPk;
        aggiornaVisibilitaCategoriaNuova(f);
        fileAttualeInModifica = { url: riga.dataset.fileUrl, nome: riga.dataset.nomeFile };
        impostaCampoFileEsistente(f, fileAttualeInModifica.url, fileAttualeInModifica.nome);
        modalBootstrap.show();
    }

    // Stessa fattorizzazione di apriModalModificaDocumento, per il cestino
    function confermaEliminaDocumento(riga) {
        if (!window.confirm('Eliminare questo documento?')) {
            return;
        }
        postConCsrfESostituisciAlbero(riga.dataset.urlElimina);
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

    // Click sul documento gia' selezionato (vedi il chiamante piu' sotto):
    // lo deseleziona invece di rifare la stessa fetch, il pannello torna al
    // messaggio iniziale e i bottoni fissi tornano ad agire sulla cartella
    function deselezionaDocumento() {
        albero.querySelectorAll('.list-group-item.active').forEach(function (r) {
            r.classList.remove('active');
        });
        anteprima.innerHTML = anteprimaInizialeHTML;
        aggiornaBottoniAzione();
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
                aggiornaBottoniAzione();
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

        // Dopo aver ripristinato sia la cartella aperta che il documento in
        // anteprima: i bottoni fissi devono riflettere lo stato finale, non
        // quello a meta' (es. cartella riaperta ma documento non ancora
        // ri-evidenziato)
        aggiornaBottoniAzione();
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

    // Apertura/chiusura reale di una cartella (click su una pillola, non la
    // riapertura sintetica di riapriCartella() dopo un refresh, gestita a
    // parte): Bootstrap genera questi eventi su "#corpoCartella{pk}" e
    // risalgono per bubbling fino a "albero". "shown"/"hidden" (non
    // "show"/"hide"): questi ultimi partono si' subito al click, ma
    // PRIMA che Bootstrap tolga/rimetta la classe "collapsed" sul bottone
    // (bug reale gia' capitato qui provando a usarli per anticipare
    // l'animazione: "cartellaApertaPk()" leggeva ancora lo stato vecchio,
    // i due bottoni fissi comparivano/sparivano al contrario - alla
    // chiusura invece che all'apertura). "shown"/"hidden" restano quindi
    // la fonte di verita' (stato sempre corretto, a fine transizione), la
    // reattivita' immediata al click e' gestita a parte qui sotto
    albero.addEventListener('shown.bs.collapse', aggiornaBottoniAzione);
    albero.addEventListener('hidden.bs.collapse', aggiornaBottoniAzione);

    // Chiusura di una cartella che contiene il documento selezionato: lo
    // deseleziona subito, prima ancora che l'animazione di chiusura finisca
    // ("hide.bs.collapse" parte all'inizio della chiusura - qui va bene
    // usarlo nonostante la nota sopra, perche' non dipende dallo stato
    // "collapsed" del bottone ma solo da quale riga sia gia' attiva e da
    // quale corpo si sta chiudendo) - "event.target" e' il
    // "corpoCartella{pk}" che si sta chiudendo, "contains" verifica se la
    // riga attiva e' al suo interno
    albero.addEventListener('hide.bs.collapse', function (event) {
        var rigaAttiva = albero.querySelector('.list-group-item.active');
        if (rigaAttiva && event.target.contains(rigaAttiva)) {
            deselezionaDocumento();
        }
    });

    // Reattivita' immediata al click su una pillola (o al tasto Invio/
    // Spazio da tastiera, che sotto simula un click vero - vedi il
    // listener "keydown" qui sotto): "requestAnimationFrame" rimanda
    // l'aggiornamento al fotogramma successivo, quando la gestione
    // sincrona del click (compresa quella di Bootstrap, che tocca la
    // classe "collapsed" nel proprio handler su "document", eseguito
    // DOPO questo perche' piu' lontano nella risalita dell'evento) e' gia'
    // sicuramente conclusa - a differenza di "show.bs.collapse" (vedi
    // sopra) non dipende dal fatto che Bootstrap abbia gia' aggiornato lo
    // stato quando l'evento arriva, quindi legge sempre il valore corretto
    // e comunque quasi subito (un fotogramma), non a fine animazione
    albero.addEventListener('click', function (event) {
        if (event.target.closest('.accordion-button')) {
            requestAnimationFrame(aggiornaBottoniAzione);
        }
    });

    if (btnRinominaCategoria) {
        btnRinominaCategoria.addEventListener('click', function () {
            var riga = documentoSelezionatoAttivo();
            if (riga) {
                apriModalModificaDocumento(riga);
                return;
            }
            var pk = cartellaApertaPk();
            if (pk !== null) {
                iniziaRinominaCategoria(pk);
            }
        });
    }

    if (btnEliminaCategoria) {
        btnEliminaCategoria.addEventListener('click', function () {
            var riga = documentoSelezionatoAttivo();
            if (riga) {
                confermaEliminaDocumento(riga);
                return;
            }
            var pk = cartellaApertaPk();
            var item = pk !== null ? document.getElementById('cartella-' + pk) : null;
            if (item) {
                eliminaCategoria(item);
            }
        });
    }

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

        var btnNomeDocumento = event.target.closest('.documento-nome-btn');
        if (btnNomeDocumento) {
            var rigaDocumento = btnNomeDocumento.closest('[data-pk]');
            if (rigaDocumento) {
                if (rigaDocumento.classList.contains('active')) {
                    deselezionaDocumento();
                } else {
                    mostraAnteprimaDocumento(rigaDocumento.dataset.pk, rigaDocumento.dataset.urlAnteprima);
                }
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
