// Gestione documenti: apertura/precompilazione del pop-up, salvataggio/
// eliminazione di documenti e categorie via AJAX (fetch) - senza mai
// ricaricare la pagina. Stesso pattern di gestione-avvisi.js (header
// X-Requested-With, il server risponde con un frammento HTML che
// sostituisce quello esistente nella pagina). L'albero
// (partials/albero_documenti.html) mostra tutte le cartelle, aperte/
// chiuse una alla volta via accordion Bootstrap nativo
// (data-bs-toggle="collapse"). Cliccare il nome di un documento apre il
// file in una nuova scheda, tranne mentre "Modifica"/"Elimina" e' armato
// (impostaModalita piu' sotto).

(function () {
    var albero = document.getElementById('albero-documenti');
    var modalEl = document.getElementById('modalDocumento');
    var modalBody = document.getElementById('modalDocumentoBody');
    var btnNuovo = document.getElementById('btnNuovoDocumento');
    var tabellaDocumenti = document.getElementById('tabella-documenti');
    var filtroSezioneWrapper = document.getElementById('filtroSezioneDocumentiWrapper');
    var listaFiltroSezione = filtroSezioneWrapper ? filtroSezioneWrapper.querySelector('.filtro-dropdown-menu') : null;
    var wrapperAzioni = document.getElementById('pannelloAzioni');
    var btnModifica = document.getElementById('btnModifica');
    var btnElimina = document.getElementById('btnElimina');
    var btnAnnullaModalita = document.getElementById('btnAnnullaModalita');
    var messaggioModalita = document.getElementById('messaggioModalita');
    var btnModificaTabella = document.getElementById('btnModificaTabella');
    var btnEliminaTabella = document.getElementById('btnEliminaTabella');
    var btnAnnullaModalitaTabella = document.getElementById('btnAnnullaModalitaTabella');
    var messaggioModalitaTabella = document.getElementById('messaggioModalitaTabella');
    if (!albero || !modalEl || !modalBody) {
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

    // Testo dell'opzione correntemente selezionata in "categoria" (il vero
    // <select>, sempre nascosto - vedi "#campoCategoria #div_id_categoria"
    // in documenti.css): usato per mostrare il nome nel campo di sola
    // lettura "Nome categoria" senza un giro separato sul server, dato che
    // le opzioni sono gia' tutte nel DOM
    function testoOpzioneSelezionata(select) {
        if (!select || select.selectedIndex < 0) {
            return '';
        }
        return select.options[select.selectedIndex].textContent;
    }

    // Sposta il pallino ".pallino-pagina-corrente" sulla voce di pk dato
    // nel menu "Seleziona categoria", o lo rimuove se pk e' nullo
    function aggiornaPallinoCategoria(f, pk) {
        var menu = f ? f.querySelector('.dropdown-menu-categoria') : null;
        if (!menu) {
            return;
        }
        var precedente = menu.querySelector('.pallino-pagina-corrente');
        if (precedente) {
            precedente.remove();
        }
        if (!pk) {
            return;
        }
        var voce = menu.querySelector('.dropdown-item-categoria[data-pk="' + pk + '"]');
        if (voce) {
            var pallino = document.createElement('span');
            pallino.className = 'pallino-pagina-corrente';
            pallino.setAttribute('aria-hidden', 'true');
            voce.appendChild(pallino);
        }
    }

    // Rimuove "#erroreCategoriaNuova" dal form, se presente
    function nascondiErroreCategoriaNuova(f) {
        var errore = f ? f.querySelector('#erroreCategoriaNuova') : null;
        if (errore) {
            errore.remove();
        }
    }

    // Imposta il <select> "categoria" e il campo "Nome categoria" (di sola
    // lettura) sulla categoria scelta dal menu "Seleziona categoria"
    function impostaCategoriaEsistente(pk, nome) {
        var f = formCorrente();
        var riga = document.getElementById('rigaNomeCategoria');
        var campoNome = f ? f.elements['categoria_nuova'] : null;
        if (!f || !riga || !campoNome || !f.elements['categoria']) {
            return;
        }
        f.elements['categoria'].value = pk;
        campoNome.value = nome;
        campoNome.readOnly = true;
        riga.classList.remove('campo-categoria-nascosto');
        aggiornaPallinoCategoria(f, pk);
        nascondiErroreCategoriaNuova(f);
    }

    // Svuota il <select> "categoria" e mostra "Nome categoria" vuoto e modificabile
    function attivaCreaCategoria() {
        var f = formCorrente();
        var riga = document.getElementById('rigaNomeCategoria');
        var campoNome = f ? f.elements['categoria_nuova'] : null;
        if (!f || !riga || !campoNome || !f.elements['categoria']) {
            return;
        }
        f.elements['categoria'].value = '';
        campoNome.value = '';
        campoNome.readOnly = false;
        riga.classList.remove('campo-categoria-nascosto');
        aggiornaPallinoCategoria(f, null);
        nascondiErroreCategoriaNuova(f);
    }

    // Riallinea le due pillole/"Nome categoria" allo stato gia' presente
    // nel form corrente (il vero <select> e "categoria_nuova", entrambi
    // "bound" - valorizzati dal server dopo un errore di validazione, o
    // dalla precompilazione della cartella aperta in "+ Nuovo documento"
    // qui sotto): serve perche' in entrambi i casi il markup fresco non
    // sa nulla dello stato solo-client (sola lettura o meno, riga visibile
    // o meno) impostato dai click sulle pillole
    function sincronizzaStatoCategoria() {
        var f = formCorrente();
        var riga = document.getElementById('rigaNomeCategoria');
        if (!f || !riga || !f.elements['categoria'] || !f.elements['categoria_nuova']) {
            return;
        }
        var select = f.elements['categoria'];
        var campoNome = f.elements['categoria_nuova'];
        if (select.value) {
            campoNome.value = testoOpzioneSelezionata(select);
            campoNome.readOnly = true;
            riga.classList.remove('campo-categoria-nascosto');
        } else if (campoNome.value.trim()) {
            campoNome.readOnly = false;
            riga.classList.remove('campo-categoria-nascosto');
        } else {
            campoNome.readOnly = false;
            riga.classList.add('campo-categoria-nascosto');
        }
    }

    // In modifica il file non ha bisogno di essere ri-scelto per forza:
    // l'icona del cerchio "Carica File" passa da upload a reload per
    // segnalare che un file e' gia' presente (nuovo documento -> file
    // scelto, o modifica -> file gia' salvato), senza comparire/sparire
    // una riga separata - il bottone e la sua azione (mostraSelettoreFile)
    // restano gli stessi in entrambi gli stati, cambia solo l'icona. Sotto
    // "Nome file" compare anche un link cliccabile al file vero e proprio
    // (nome con estensione, url passato da chi chiama - un file appena
    // scelto usa un URL locale temporaneo, vedi il listener "change" piu'
    // sotto), verifica immediata che sia quello giusto senza dover prima
    // salvare
    function impostaCampoFileEsistente(url, nome) {
        var icona = document.getElementById('iconaCaricaFile');
        var btn = document.getElementById('btnCaricaFile');
        var link = document.getElementById('linkFileSelezionato');
        if (!icona || !btn) {
            return;
        }
        icona.classList.remove('bi-upload');
        icona.classList.add('bi-arrow-repeat');
        btn.title = 'Cambia file';
        btn.setAttribute('aria-label', 'Cambia file');
        if (link) {
            link.href = url || '#';
            link.textContent = nome || '';
            link.classList.remove('d-none');
        }
    }

    // Click sul cerchio "Carica File"/"Cambia file" (vedi
    // impostaCampoFileEsistente sopra): apre subito la finestra di scelta
    // file del sistema operativo. Il vero <input type="file"> (generato da
    // crispy, vedi "#campoFile #div_id_file" in documenti.css) resta
    // sempre nascosto, mai mostrato a video - un input file nascosto puo'
    // comunque essere aperto via ".click()" da un vero gesto dell'utente,
    // tecnica comune per bottoni "Carica file" personalizzati
    function mostraSelettoreFile() {
        var f = formCorrente();
        var inputFile = f ? f.elements['file'] : null;
        if (inputFile) {
            inputFile.click();
        }
    }

    // null = modal in modalita' "nuovo documento"; altrimenti {url, nome}
    // del file gia' presente (modifica) o appena scelto (nuovo documento) -
    // serve a riapplicare impostaCampoFileEsistente() dopo che un errore
    // di validazione sostituisce l'intero modalBody con un form fresco dal
    // server (che non sa nulla di questo stato solo-client), stesso
    // motivo per cui anche sincronizzaStatoCategoria() viene rieseguita li'
    // sotto
    var fileAttualeInModifica = null;

    // Oggetto File dell'ultimo file scelto dal selettore, non ancora caricato
    var fileNuovoScelto = null;

    // URL locale temporaneo ("blob:", vedi il listener "change" piu' sotto)
    // dell'ultimo file appena scelto (non ancora caricato sul server): va
    // revocato esplicitamente quando non serve piu' (se ne sceglie un
    // altro, o il modal torna alla modalita' "nuovo documento"), altrimenti
    // resterebbe allocato in memoria per tutta la vita della pagina
    var blobFileScelto = null;

    function revocaBlobFileScelto() {
        if (blobFileScelto) {
            URL.revokeObjectURL(blobFileScelto);
            blobFileScelto = null;
        }
        fileNuovoScelto = null;
    }

    // null = nessuna categoria in rinomina; altrimenti l'"accordion-item"
    // (l'intero blocco cartella, non solo l'intestazione) la cui rinomina
    // inline e' in corso - permette di annullarla (Esc, click altrove)
    // ripristinando testo/input senza dover tracciare pk e nome originale
    // separatamente
    var rigaCategoriaInRinomina = null;

    // null = nessun nome documento in rinomina; altrimenti la cella
    // "Nome documento" della riga (stesso principio di
    // "rigaCategoriaInRinomina" sopra, per la tabella desktop)
    var cellaDocumentoInRinomina = null;

    // null = nessuna modalita' armata; altrimenti 'modifica' o 'elimina'
    var modalita = null;

    // null = nessuna modalita' armata sulla tabella desktop; altrimenti
    // 'modifica' o 'elimina' - stesso principio di "modalita" sopra ma per
    // "#tabella-documenti": due bottoni generici armano l'azione, il click
    // sulla riga del documento la esegue
    var modalitaTabella = null;

    function aggiornaVistaModalitaTabella() {
        if (btnAnnullaModalitaTabella) {
            btnAnnullaModalitaTabella.classList.toggle('d-none', !modalitaTabella);
        }
        if (messaggioModalitaTabella) {
            messaggioModalitaTabella.classList.toggle('d-none', !modalitaTabella);
            if (modalitaTabella === 'modifica') {
                messaggioModalitaTabella.textContent = 'Scegli il nome, la sezione o il file da modificare';
            } else if (modalitaTabella === 'elimina') {
                messaggioModalitaTabella.textContent = 'Scegli un documento o una sezione da eliminare';
            }
        }
        if (tabellaDocumenti) {
            var righe = tabellaDocumenti.querySelectorAll('tr[data-pk]');
            Array.prototype.forEach.call(righe, function (riga) {
                riga.classList.toggle('documento-riga-selezionabile', !!modalitaTabella);
            });
        }
    }

    function impostaModalitaTabella(azione) {
        modalitaTabella = modalitaTabella === azione ? null : azione;
        aggiornaVistaModalitaTabella();
    }

    function annullaModalitaTabella() {
        modalitaTabella = null;
        aggiornaVistaModalitaTabella();
    }

    // null = nessuna sezione selezionata nel filtro, altrimenti pk della
    // sezione scelta come stringa
    var categoriaFiltrataPk = null;

    // Mostra solo le righe di "#tabella-documenti" della sezione filtrata
    function applicaFiltroSezione() {
        if (!tabellaDocumenti) {
            return;
        }
        var righe = tabellaDocumenti.querySelectorAll('tr[data-pk]');
        Array.prototype.forEach.call(righe, function (riga) {
            var corrisponde = categoriaFiltrataPk === null || riga.dataset.categoriaPk === categoriaFiltrataPk;
            riga.classList.toggle('d-none', !corrisponde);
        });
    }

    // Marca come attiva la voce del filtro scelta
    function impostaVoceFiltroSezioneAttiva(voceScelta) {
        if (!listaFiltroSezione) {
            return;
        }
        var voci = listaFiltroSezione.querySelectorAll('.filtro-dropdown-item');
        for (var i = 0; i < voci.length; i++) {
            voci[i].classList.toggle('active', voci[i] === voceScelta);
        }
    }

    function aggiornaClasseFiltroSezioneAttivo() {
        if (!filtroSezioneWrapper || !listaFiltroSezione) {
            return;
        }
        var iconaFiltro = filtroSezioneWrapper.querySelector('.filtro-icon-overlay');
        var primaVoce = listaFiltroSezione.querySelector('.filtro-dropdown-item');
        if (!iconaFiltro || !primaVoce) {
            return;
        }
        var attivo = !primaVoce.classList.contains('active');
        iconaFiltro.classList.toggle('bi-funnel-fill', attivo);
        iconaFiltro.classList.toggle('bi-funnel', !attivo);
    }

    if (listaFiltroSezione) {
        listaFiltroSezione.addEventListener('click', function (event) {
            var voce = event.target.closest('.filtro-dropdown-item');
            if (!voce) {
                return;
            }
            event.preventDefault();
            impostaVoceFiltroSezioneAttiva(voce);
            aggiornaClasseFiltroSezioneAttivo();
            categoriaFiltrataPk = voce.dataset.categoriaPk || null;
            applicaFiltroSezione();
        });
        aggiornaClasseFiltroSezioneAttivo();
    }

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

    // Mostra/nasconde il pannello "Modifica"/"Elimina" in base alla
    // cartella aperta, e richiama aggiornaVistaModalita()
    function aggiornaBottoniAzione() {
        if (wrapperAzioni) {
            wrapperAzioni.classList.toggle('azioni-categoria-nascosta', cartellaApertaPk() === null);
        }
        aggiornaVistaModalita();
    }

    // Toglie (attivo=false) o ripristina (attivo=true) "data-bs-toggle" sul
    // bottone della cartella aperta, salvando il valore originale in
    // "data-bs-toggle-salvato"
    function impostaToggleCartelle(attivo) {
        var disabilitati = albero.querySelectorAll('.accordion-button[data-bs-toggle-salvato]');
        Array.prototype.forEach.call(disabilitati, function (bottone) {
            bottone.setAttribute('data-bs-toggle', bottone.dataset.bsToggleSalvato);
            delete bottone.dataset.bsToggleSalvato;
        });
        if (attivo) {
            return;
        }
        var pk = cartellaApertaPk();
        var bottone = pk !== null ? document.querySelector('#cartella-' + pk + ' .accordion-button') : null;
        if (bottone && bottone.hasAttribute('data-bs-toggle')) {
            bottone.dataset.bsToggleSalvato = bottone.getAttribute('data-bs-toggle');
            bottone.removeAttribute('data-bs-toggle');
        }
    }

    // Mostra/nasconde il bottone Annulla e il messaggio guida, evidenzia
    // le righe documento selezionabili, attiva/disattiva il toggle della cartella aperta
    function aggiornaVistaModalita() {
        if (btnAnnullaModalita) {
            btnAnnullaModalita.classList.toggle('d-none', !modalita);
        }
        if (messaggioModalita) {
            messaggioModalita.classList.toggle('d-none', !modalita);
            if (modalita) {
                messaggioModalita.textContent = 'Scegli la categoria o un file al suo interno';
            }
        }
        impostaToggleCartelle(!modalita);
        var righe = albero.querySelectorAll('.list-group-item[data-pk]');
        Array.prototype.forEach.call(righe, function (riga) {
            riga.classList.toggle('documento-riga-selezionabile', !!modalita);
        });
    }

    // Arma "azione", o la disarma se era gia' quella attiva
    function impostaModalita(azione) {
        modalita = modalita === azione ? null : azione;
        aggiornaVistaModalita();
    }

    function annullaModalita() {
        modalita = null;
        aggiornaVistaModalita();
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
        var bottone = item.querySelector('.accordion-button, .testo-sezione-riga');
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
        var bottone = item.querySelector('.accordion-button, .testo-sezione-riga');
        var input = item.querySelector('.input-rinomina-categoria');
        if (bottone && input) {
            input.classList.add('d-none');
            bottone.classList.remove('d-none');
        }
    }

    // "item" e' l'"accordion-item" della cartella nell'albero, o la cella "Sezione" di una riga della tabella
    function iniziaRinominaCategoria(item) {
        if (!item) {
            return;
        }
        var bottone = item.querySelector('.accordion-button, .testo-sezione-riga');
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

    function annullaRinominaNomeDocumento() {
        if (!cellaDocumentoInRinomina) {
            return;
        }
        var cella = cellaDocumentoInRinomina;
        cellaDocumentoInRinomina = null;
        var testo = cella.querySelector('.testo-nome-documento-riga');
        var input = cella.querySelector('.input-rinomina-documento');
        if (testo && input) {
            input.classList.add('d-none');
            testo.classList.remove('d-none');
        }
    }

    // "cella" e' la cella "Nome documento" di una riga della tabella
    function iniziaRinominaNomeDocumento(cella) {
        if (!cella) {
            return;
        }
        var testo = cella.querySelector('.testo-nome-documento-riga');
        var input = cella.querySelector('.input-rinomina-documento');
        if (!testo || !input) {
            return;
        }
        cellaDocumentoInRinomina = cella;
        input.value = cella.closest('tr[data-pk]').dataset.nomeFile;
        testo.classList.add('d-none');
        input.classList.remove('d-none');
        input.focus();
        input.select();
    }

    // Rinomina solo "nome_file" (stesso endpoint di modifica_documento,
    // con la categoria attuale invariata cosi' il form resta valido senza
    // doverla ripetere/cambiare file)
    function salvaRinominaNomeDocumento(input) {
        var riga = input.closest('tr[data-pk]');
        var nuovoNome = input.value.trim();
        if (!riga || !nuovoNome) {
            return;
        }
        var corpo = new FormData();
        corpo.append('nome_file', nuovoNome);
        corpo.append('categoria', riga.dataset.categoriaPk);
        var token = tokenCsrf();
        if (token) {
            corpo.append('csrfmiddlewaretoken', token);
        }
        fetch(riga.dataset.urlModificaDocumento, {
            method: 'POST',
            body: corpo,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                cellaDocumentoInRinomina = null;
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

    // Chiede conferma ed elimina la categoria; ritorna true/false a seconda della conferma
    function eliminaCategoria(item) {
        var numeroSpan = item.querySelector('.numero-documenti-categoria');
        var numDocumenti = parseInt((numeroSpan ? numeroSpan.textContent : item.dataset.numDocumenti) || '0', 10) || 0;
        var messaggio = numDocumenti > 0
            ? 'Eliminare la categoria "' + item.dataset.nomeCategoria + '"? Verranno eliminati anche i ' + numDocumenti + ' documenti al suo interno.'
            : 'Eliminare la categoria "' + item.dataset.nomeCategoria + '"?';
        if (!window.confirm(messaggio)) {
            return false;
        }
        postConCsrfESostituisciAlbero(item.dataset.urlEliminaCategoria);
        return true;
    }

    // Riporta nello snapshot del form vuoto (usato da "+ Nuovo documento")
    // le stesse opzioni della select "categoria" appena ricevute dal
    // server: senza questo, una categoria creata al volo (campo "Nome
    // categoria" in form_documento.html) resterebbe invisibile li' finche'
    // non si ricarica l'intera pagina - lo snapshot e' catturato una sola
    // volta all'avvio (vedi sopra) e altrimenti non si aggiorna mai da solo.
    // Ricostruisce anche le voci del menu "Seleziona categoria" dalle stesse opzioni.
    function aggiornaOpzioniCategoriaNelFormVuoto(opzioniHTML) {
        var tmp = document.createElement('div');
        tmp.innerHTML = formInizialeHTML;
        var select = tmp.querySelector('#id_categoria');
        var menu = tmp.querySelector('.dropdown-menu-categoria');
        if (!select || !menu) {
            return;
        }
        select.innerHTML = opzioniHTML;
        menu.innerHTML = '';
        Array.prototype.forEach.call(select.options, function (opzione) {
            if (!opzione.value) {
                return;
            }
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.className = 'dropdown-item dropdown-item-categoria d-flex align-items-center gap-2';
            a.href = '#';
            a.dataset.pk = opzione.value;
            a.dataset.nome = opzione.textContent;
            a.textContent = opzione.textContent;
            li.appendChild(a);
            menu.appendChild(li);
        });
        if (!menu.children.length) {
            var liVuoto = document.createElement('li');
            var span = document.createElement('span');
            span.className = 'dropdown-item-text text-muted';
            span.textContent = 'Nessuna categoria esistente';
            liVuoto.appendChild(span);
            menu.appendChild(liVuoto);
        }
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
        // swap (il markup fresco dal server non sa quale cartella fosse
        // aperta prima del refresh)
        var pkCartellaAperta = cartellaApertaPk();

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

        var nuovaTabella = tmp.querySelector('#tabella-documenti');
        if (tabellaDocumenti && nuovaTabella) {
            if (window.Idiomorph) {
                Idiomorph.morph(tabellaDocumenti, nuovaTabella.innerHTML, { morphStyle: 'innerHTML' });
            } else {
                tabellaDocumenti.innerHTML = nuovaTabella.innerHTML;
            }
            applicaFiltroSezione();
        }

        // Ripristina la stessa cartella aperta prima del refresh, se
        // esiste ancora
        if (pkCartellaAperta !== null) {
            riapriCartella(pkCartellaAperta);
        }
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
                    sincronizzaStatoCategoria();
                    if (fileAttualeInModifica) {
                        impostaCampoFileEsistente(fileAttualeInModifica.url, fileAttualeInModifica.nome);
                    } else if (fileNuovoScelto) {
                        // Reimbusta il file scelto nel nuovo <input type=file> tramite DataTransfer
                        var fFresco = formCorrente();
                        var inputFile = fFresco ? fFresco.elements['file'] : null;
                        if (inputFile) {
                            var trasferimento = new DataTransfer();
                            trasferimento.items.add(fileNuovoScelto);
                            inputFile.files = trasferimento.files;
                        }
                        impostaCampoFileEsistente(blobFileScelto, fileNuovoScelto.name);
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

    // Apre il modal precompilato con i dati del documento scelto, per la sua modifica
    function apriModaleModificaDocumento(riga) {
        revocaBlobFileScelto();
        fileAttualeInModifica = null;
        modalBody.innerHTML = formInizialeHTML;
        var f = formCorrente();
        if (!f) {
            return;
        }
        f.action = riga.dataset.urlModificaDocumento;
        if (f.elements['nome_file']) {
            f.elements['nome_file'].value = riga.dataset.nomeFile || '';
        }
        var categoriaPk = riga.dataset.categoriaPk;
        var vocePillola = f.querySelector('.dropdown-item-categoria[data-pk="' + categoriaPk + '"]');
        if (vocePillola) {
            impostaCategoriaEsistente(categoriaPk, vocePillola.dataset.nome);
        }
        var linkFile = riga.querySelector('.documento-nome-btn');
        if (linkFile && riga.dataset.fileNome) {
            fileAttualeInModifica = { url: linkFile.href, nome: riga.dataset.fileNome.split('/').pop() };
            impostaCampoFileEsistente(fileAttualeInModifica.url, fileAttualeInModifica.nome);
        }
        annullaModalita();
        modalBootstrap.show();
    }

    // Chiede conferma ed elimina il documento scelto
    // Chiede conferma ed elimina il documento scelto; ritorna true/false a seconda della conferma
    function eliminaDocumentoScelto(riga) {
        var nome = riga.dataset.nomeFile || 'questo documento';
        if (!window.confirm('Eliminare "' + nome + '"?')) {
            return false;
        }
        postConCsrfESostituisciAlbero(riga.dataset.urlEliminaDocumento);
        annullaModalita();
        return true;
    }

    sincronizzaStatoCategoria();

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

    if (btnModifica) {
        btnModifica.addEventListener('click', function () {
            impostaModalita('modifica');
        });
    }

    if (btnElimina) {
        btnElimina.addEventListener('click', function () {
            impostaModalita('elimina');
        });
    }

    if (btnAnnullaModalita) {
        btnAnnullaModalita.addEventListener('click', annullaModalita);
    }

    if (btnNuovo) {
        btnNuovo.addEventListener('click', function () {
            annullaModalita();
            fileAttualeInModifica = null;
            revocaBlobFileScelto();
            modalBody.innerHTML = formInizialeHTML;
            // Precompila la categoria della cartella aperta, se c'e'
            // (comodo per aggiungere piu' documenti di fila alla stessa
            // cartella)
            var pkCartellaAperta = cartellaApertaPk();
            if (pkCartellaAperta !== null) {
                var f = formCorrente();
                if (f && f.elements['categoria']) {
                    f.elements['categoria'].value = pkCartellaAperta;
                }
            }
            sincronizzaStatoCategoria();
        });
    }

    if (btnModificaTabella) {
        btnModificaTabella.addEventListener('click', function () {
            impostaModalitaTabella('modifica');
        });
    }

    if (btnEliminaTabella) {
        btnEliminaTabella.addEventListener('click', function () {
            impostaModalitaTabella('elimina');
        });
    }

    if (btnAnnullaModalitaTabella) {
        btnAnnullaModalitaTabella.addEventListener('click', annullaModalitaTabella);
    }

    // Click mentre "Modifica"/"Elimina" e' armato sulla tabella desktop
    // (partials/albero_documenti.html, "#tabella-documenti"): in modifica
    // ogni cella ha il suo bersaglio (nome del documento, sezione, o il
    // pop-up completo sulla cella "File"); in elimina la cella "Sezione"
    // elimina la categoria, il resto della riga elimina il documento
    if (tabellaDocumenti) {
        tabellaDocumenti.addEventListener('click', function (event) {
            if (!modalitaTabella) {
                return;
            }
            var cellaSezione = event.target.closest('.sezione-cella-riga');
            if (cellaSezione) {
                event.preventDefault();
                if (modalitaTabella === 'modifica') {
                    iniziaRinominaCategoria(cellaSezione);
                    annullaModalitaTabella();
                } else if (modalitaTabella === 'elimina' && eliminaCategoria(cellaSezione)) {
                    annullaModalitaTabella();
                }
                return;
            }
            if (modalitaTabella === 'modifica') {
                var cellaNome = event.target.closest('.nome-documento-cella-riga');
                if (cellaNome) {
                    event.preventDefault();
                    iniziaRinominaNomeDocumento(cellaNome);
                    annullaModalitaTabella();
                    return;
                }
            }
            var riga = event.target.closest('tr[data-pk]');
            if (!riga) {
                return;
            }
            event.preventDefault();
            if (modalitaTabella === 'modifica') {
                apriModaleModificaDocumento(riga);
                annullaModalitaTabella();
            } else if (modalitaTabella === 'elimina' && eliminaDocumentoScelto(riga)) {
                annullaModalitaTabella();
            }
        });

        // Invio/Esc dentro il campo di rinomina inline (cella "Sezione" o "Nome documento")
        tabellaDocumenti.addEventListener('keydown', function (event) {
            var inputCategoria = event.target.closest('.input-rinomina-categoria');
            if (inputCategoria) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    salvaRinominaCategoria(inputCategoria);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    annullaRinominaCategoria();
                }
                return;
            }
            var inputDocumento = event.target.closest('.input-rinomina-documento');
            if (inputDocumento) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    salvaRinominaNomeDocumento(inputDocumento);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    annullaRinominaNomeDocumento();
                }
            }
        });

        // "blur" non fa bubbling: cattura (terzo argomento "true") per
        // intercettare comunque l'uscita dal campo per click altrove
        tabellaDocumenti.addEventListener('blur', function (event) {
            if (!event.target.closest) {
                return;
            }
            if (event.target.closest('.input-rinomina-categoria')) {
                annullaRinominaCategoria();
            } else if (event.target.closest('.input-rinomina-documento')) {
                annullaRinominaNomeDocumento();
            }
        }, true);
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
        }
    });

    // Click mentre "Modifica"/"Elimina" e' armato: agisce sulla categoria
    // aperta o su un documento al suo interno
    albero.addEventListener('click', function (event) {
        if (!modalita) {
            return;
        }
        var pk = cartellaApertaPk();
        if (pk === null) {
            return;
        }
        var bottoneCategoria = event.target.closest('.accordion-button');
        if (bottoneCategoria) {
            var item = bottoneCategoria.closest('.accordion-item[data-categoria-pk]');
            if (!item || item.dataset.categoriaPk !== pk) {
                return;
            }
            event.preventDefault();
            if (modalita === 'modifica') {
                iniziaRinominaCategoria(item);
                annullaModalita();
            } else if (modalita === 'elimina' && eliminaCategoria(item)) {
                annullaModalita();
            }
            return;
        }
        var riga = event.target.closest('.list-group-item[data-pk]');
        if (!riga) {
            return;
        }
        event.preventDefault();
        if (modalita === 'modifica') {
            apriModaleModificaDocumento(riga);
        } else if (modalita === 'elimina') {
            eliminaDocumentoScelto(riga);
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

    // Delegato su "modalBody" (stabile, mai ricreato - solo il suo
    // "innerHTML" cambia tra un documento e l'altro o dopo un errore di
    // validazione) invece che sul bottone stesso, che altrimenti andrebbe
    // riagganciato ad ogni sostituzione del contenuto del modal
    modalBody.addEventListener('click', function (event) {
        if (event.target.closest('#btnCaricaFile')) {
            mostraSelettoreFile();
            return;
        }
        if (event.target.closest('#btnCreaCategoria')) {
            attivaCreaCategoria();
            return;
        }
        var voceCategoria = event.target.closest('.dropdown-item-categoria');
        if (voceCategoria) {
            // "href=#" e' solo un aggancio per il menu Bootstrap: senza
            // preventDefault la pagina salterebbe in cima
            event.preventDefault();
            if (voceCategoria.dataset.pk) {
                impostaCategoriaEsistente(voceCategoria.dataset.pk, voceCategoria.dataset.nome);
            }
            return;
        }
    });

    // Scelto un file dal selettore nativo (vedi mostraSelettoreFile sopra):
    // l'icona del cerchio passa da upload a reload e sotto compare il link
    // cliccabile al file (impostaCampoFileEsistente) - qui con un URL
    // locale temporaneo ("blob:", URL.createObjectURL), dato che il file
    // non e' ancora stato caricato sul server: la precedente (se c'era,
    // cambiando scelta piu' volte) va revocata prima, altrimenti restano
    // allocate in memoria finche' non si chiude la pagina. Precompila
    // anche "Nome file" con lo stesso nome (senza estensione, un "Nome"
    // non deve ripetere ".pdf" - gia' garantito PDF da
    // DocumentoForm.clean_file): il cliente lo trova gia' pronto, e lo
    // cambia solo se vuole un nome diverso invece di doverlo scrivere da
    // zero ogni volta
    modalBody.addEventListener('change', function (event) {
        var input = event.target.closest('#form-documento [name="file"]');
        if (input && input.files && input.files[0]) {
            var file = input.files[0];
            revocaBlobFileScelto();
            blobFileScelto = URL.createObjectURL(file);
            fileNuovoScelto = file;
            impostaCampoFileEsistente(blobFileScelto, file.name);
            var f = formCorrente();
            if (f && f.elements['nome_file']) {
                f.elements['nome_file'].value = file.name.replace(/\.[^.]+$/, '');
            }
        }
    });
})();
