// Gestione del pop-up e delle richieste AJAX di documenti/categorie:
// apertura/precompilazione del form, salvataggio ed eliminazione senza
// ricaricare la pagina. L'albero mostra le cartelle aperte/chiuse una
// alla volta via accordion Bootstrap. Cliccare il nome di un documento
// apre il file in una nuova scheda, tranne mentre "Modifica"/"Elimina"
// e' armato (impostaModalita piu' sotto).

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
    if (!albero || !modalEl || !modalBody) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    // Snapshot del form vuoto usato da "+ Nuovo documento" per ripartire da uno stato pulito
    var formInizialeHTML = modalBody.innerHTML;

    function formCorrente() {
        return document.getElementById('form-documento');
    }

    // Legge il token CSRF dal form del modal, presente nel DOM anche a modal chiuso
    function tokenCsrf() {
        var f = formCorrente();
        var tokenInput = f ? f.querySelector('[name=csrfmiddlewaretoken]') : null;
        return tokenInput ? tokenInput.value : null;
    }

    // Ritorna il testo dell'opzione correntemente selezionata nel <select> "categoria"
    function testoOpzioneSelezionata(select) {
        if (!select || select.selectedIndex < 0) {
            return '';
        }
        return select.options[select.selectedIndex].textContent;
    }

    // Sposta il pallino ".pallino-pagina-corrente" sulla voce di pk dato nel menu "Seleziona categoria", o lo rimuove se pk e' nullo
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

    // Aggiorna sola-lettura e visibilita' della riga "Nome categoria" in base al <select> e a "categoria_nuova" nel form corrente
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

    // Cambia l'icona del cerchio "Carica File" da upload a reload e mostra un link cliccabile al file (url, nome) sotto "Nome file"
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

    // Apre la finestra di scelta file del sistema operativo cliccando l'<input type="file"> nascosto
    function mostraSelettoreFile() {
        var f = formCorrente();
        var inputFile = f ? f.elements['file'] : null;
        if (inputFile) {
            inputFile.click();
        }
    }

    // Valore di "nome_file" all'apertura del pop-up, usato da valutaBottoneSalva() per rilevare modifiche
    var nomeFileOriginale = '';

    // Pk della categoria all'apertura del pop-up, usato da valutaBottoneSalva() per rilevare modifiche
    var categoriaOriginalePk = '';

    // Mostra il bottone "Salva" se nome file, file, categoria selezionata o nuova categoria differiscono dai valori originali
    function valutaBottoneSalva() {
        var f = formCorrente();
        var btn = f ? f.querySelector('button[type="submit"]') : null;
        if (!f || !btn) {
            return;
        }
        var campoNomeFile = f.elements['nome_file'];
        var nomeFileModificato = !!campoNomeFile && campoNomeFile.value.trim() !== nomeFileOriginale;

        var campoCategoria = f.elements['categoria'];
        var categoriaSelezionata = campoCategoria ? campoCategoria.value : '';
        var categoriaDiversa = !!categoriaSelezionata && categoriaSelezionata !== categoriaOriginalePk;

        var campoCategoriaNuova = f.elements['categoria_nuova'];
        var nomeCategoriaNuova = campoCategoriaNuova ? campoCategoriaNuova.value.trim() : '';
        var categoriaNuovaValida = false;
        if (nomeCategoriaNuova && campoCategoria) {
            var giaEsistente = Array.prototype.some.call(campoCategoria.options, function (opzione) {
                return opzione.value && opzione.textContent.trim().toLowerCase() === nomeCategoriaNuova.toLowerCase();
            });
            categoriaNuovaValida = !giaEsistente;
        }

        var modificato = nomeFileModificato || !!fileNuovoScelto || categoriaDiversa || categoriaNuovaValida;
        btn.classList.toggle('d-none', !modificato);
    }

    // null = modal in modalita' "nuovo documento"; altrimenti {url, nome} del file gia' presente o appena scelto
    var fileAttualeInModifica = null;

    // Oggetto File dell'ultimo file scelto dal selettore, non ancora caricato
    var fileNuovoScelto = null;

    // URL locale temporaneo ("blob:") dell'ultimo file scelto, non ancora caricato sul server
    var blobFileScelto = null;

    function revocaBlobFileScelto() {
        if (blobFileScelto) {
            URL.revokeObjectURL(blobFileScelto);
            blobFileScelto = null;
        }
        fileNuovoScelto = null;
    }

    // null = nessuna categoria in rinomina; altrimenti l'"accordion-item" la cui rinomina inline e' in corso
    var rigaCategoriaInRinomina = null;

    // null = nessuna modalita' armata; altrimenti 'modifica' o 'elimina'
    var modalita = null;

    // null = nessuna sezione selezionata nel filtro, altrimenti pk della sezione scelta come stringa
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

    // Legge dal DOM il pk della cartella attualmente aperta (al piu' una), o null se nessuna e' aperta
    function cartellaApertaPk() {
        var bottoneAperto = albero.querySelector('.accordion-button:not(.collapsed)');
        if (!bottoneAperto) {
            return null;
        }
        var item = bottoneAperto.closest('[data-categoria-pk]');
        return item ? item.dataset.categoriaPk : null;
    }

    // Mostra/nasconde il pannello "Modifica"/"Elimina" in base alla cartella aperta, e richiama aggiornaVistaModalita()
    function aggiornaBottoniAzione() {
        if (wrapperAzioni) {
            wrapperAzioni.classList.toggle('azioni-categoria-nascosta', cartellaApertaPk() === null);
        }
        aggiornaVistaModalita();
    }

    // Toglie (attivo=false) o ripristina (attivo=true) "data-bs-toggle" sul bottone della cartella aperta, salvando il valore originale
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

    // Mostra/nasconde il bottone Annulla e il messaggio guida, evidenzia le righe selezionabili, attiva/disattiva il toggle delle cartelle
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

    // Applica alla cartella di pk dato le classi Bootstrap dello stato "aperta"
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
                // Nome vuoto o duplicato: mostra l'errore e lascia il campo in modifica
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

    // Aggiorna le opzioni del <select> "categoria" nello snapshot del form vuoto e ricostruisce le voci del menu "Seleziona categoria"
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
            // Risposta inattesa (es. pagina di login intera): reload completo
            window.location.reload();
            return;
        }

        // Legge dal DOM la cartella aperta prima dello swap
        var pkCartellaAperta = cartellaApertaPk();

        // Applica il nuovo HTML preservando i nodi invariati, con fallback a innerHTML diretto
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

        // Ripristina la stessa cartella aperta prima del refresh, se esiste ancora
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
                    // Sostituisce il contenuto del modal con il form con errori, che resta aperto
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
                    valutaBottoneSalva();
                } else {
                    // Altro errore (CSRF scaduto, 404, 500, ...): reload completo
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
                    // Richiesta fallita: reload completo
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
        nomeFileOriginale = riga.dataset.nomeFile || '';
        if (f.elements['nome_file']) {
            f.elements['nome_file'].value = nomeFileOriginale;
        }
        var categoriaPk = riga.dataset.categoriaPk;
        categoriaOriginalePk = categoriaPk || '';
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
        valutaBottoneSalva();
        modalBootstrap.show();
    }

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

    // Aggiorna il pannello azioni a fine transizione di apertura/chiusura di una cartella
    albero.addEventListener('shown.bs.collapse', aggiornaBottoniAzione);
    albero.addEventListener('hidden.bs.collapse', aggiornaBottoniAzione);

    // Aggiorna il pannello azioni al fotogramma successivo al click su una cartella, per una reattivita' piu' immediata
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
            nomeFileOriginale = '';
            // Precompila la categoria con quella della cartella aperta, se c'e'
            var pkCartellaAperta = cartellaApertaPk();
            categoriaOriginalePk = pkCartellaAperta || '';
            if (pkCartellaAperta !== null) {
                var f = formCorrente();
                if (f && f.elements['categoria']) {
                    f.elements['categoria'].value = pkCartellaAperta;
                }
            }
            sincronizzaStatoCategoria();
            valutaBottoneSalva();
        });
    }

    if (tabellaDocumenti) {
        // Click su una riga: apre il pop-up di modifica, tranne sul link del file e sui due bottoni di eliminazione rapida
        tabellaDocumenti.addEventListener('click', function (event) {
            if (event.target.closest('a')) {
                return;
            }
            var btnEliminaCategoria = event.target.closest('.btn-elimina-categoria-riga');
            if (btnEliminaCategoria) {
                var cellaSezione = btnEliminaCategoria.closest('tr').querySelector('.sezione-cella-riga');
                if (cellaSezione) {
                    eliminaCategoria(cellaSezione);
                }
                return;
            }
            var btnEliminaDocumento = event.target.closest('.btn-elimina-documento-riga');
            if (btnEliminaDocumento) {
                var rigaDocumento = btnEliminaDocumento.closest('tr[data-pk]');
                if (rigaDocumento) {
                    eliminaDocumentoScelto(rigaDocumento);
                }
                return;
            }
            var riga = event.target.closest('tr[data-pk]');
            if (!riga) {
                return;
            }
            apriModaleModificaDocumento(riga);
        });

        // Invio/Esc dentro il campo di rinomina inline della cella "Sezione"
        tabellaDocumenti.addEventListener('keydown', function (event) {
            var inputCategoria = event.target.closest('.input-rinomina-categoria');
            if (!inputCategoria) {
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                salvaRinominaCategoria(inputCategoria);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                annullaRinominaCategoria();
            }
        });

        // Cattura (terzo argomento "true") per intercettare l'uscita dal campo di rinomina anche se "blur" non fa bubbling
        tabellaDocumenti.addEventListener('blur', function (event) {
            if (event.target.closest && event.target.closest('.input-rinomina-categoria')) {
                annullaRinominaCategoria();
            }
        }, true);
    }

    // Delegazione sul container dell'albero: funziona anche sulle cartelle/righe rigenerate dopo ogni swap di innerHTML
    albero.addEventListener('click', function (event) {
        if (event.target.closest('.input-rinomina-categoria')) {
            // Impedisce che un click nel campo di rinomina apra/chiuda la cartella
            event.stopPropagation();
        }
    });

    // Click mentre "Modifica"/"Elimina" e' armato: agisce sulla categoria aperta o su un documento al suo interno
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

    // Invio/Spazio su "div[role=button]" apre/chiude la cartella; Invio/Esc nel campo di rinomina inline salva/annulla
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

    // Cattura (terzo argomento "true") per intercettare l'uscita dal campo di rinomina anche se "blur" non fa bubbling
    albero.addEventListener('blur', function (event) {
        if (event.target.closest && event.target.closest('.input-rinomina-categoria')) {
            annullaRinominaCategoria();
        }
    }, true);

    // Delegazione sul body del modal: il form viene sostituito per intero ad ogni errore di validazione
    modalBody.addEventListener('submit', function (event) {
        var f = event.target.closest('#form-documento');
        if (!f) {
            return;
        }
        event.preventDefault();
        salvaDocumento(f);
    });

    // Delegazione su "modalBody" (stabile): il suo innerHTML viene sostituito ad ogni documento o errore di validazione
    modalBody.addEventListener('click', function (event) {
        if (event.target.closest('#btnCaricaFile')) {
            mostraSelettoreFile();
            return;
        }
        if (event.target.closest('#btnCreaCategoria')) {
            attivaCreaCategoria();
            valutaBottoneSalva();
            return;
        }
        var voceCategoria = event.target.closest('.dropdown-item-categoria');
        if (voceCategoria) {
            // Evita che "href=#" faccia saltare la pagina in cima
            event.preventDefault();
            if (voceCategoria.dataset.pk) {
                impostaCategoriaEsistente(voceCategoria.dataset.pk, voceCategoria.dataset.nome);
                valutaBottoneSalva();
            }
            return;
        }
    });

    // Digitazione in un campo testo del form: rivaluta se mostrare o nascondere il bottone "Salva"
    modalBody.addEventListener('input', function (event) {
        if (event.target.closest('#form-documento')) {
            valutaBottoneSalva();
        }
    });

    // Scelto un file dal selettore nativo: crea un URL locale temporaneo, aggiorna icona/link del file e precompila "Nome file" (senza estensione)
    modalBody.addEventListener('change', function (event) {
        var input = event.target.closest('#form-documento [name="file"]');
        if (input && input.files && input.files[0]) {
            var file = input.files[0];
            revocaBlobFileScelto();
            blobFileScelto = URL.createObjectURL(file);
            fileNuovoScelto = file;
            impostaCampoFileEsistente(blobFileScelto, file.name);
            valutaBottoneSalva();
            var f = formCorrente();
            if (f && f.elements['nome_file']) {
                f.elements['nome_file'].value = file.name.replace(/\.[^.]+$/, '');
            }
        }
    });
})();
