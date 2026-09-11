// Gestione del pop-up e delle richieste AJAX di documenti/categorie:
// apertura/precompilazione del form, salvataggio ed eliminazione senza
// ricaricare la pagina. Cliccare una riga della tabella apre il modal di
// modifica documento; i bottoni della colonna Azioni eliminano documento
// o categoria.

(function () {
    var modalEl = document.getElementById('modalDocumento');
    var modalBody = document.getElementById('modalDocumentoBody');
    var btnNuovo = document.getElementById('btnNuovoDocumento');
    var tabellaDocumenti = document.getElementById('tabella-documenti');
    var filtroSezioneWrapper = document.getElementById('filtroSezioneDocumentiWrapper');
    var listaFiltroSezione = filtroSezioneWrapper ? filtroSezioneWrapper.querySelector('.filtro-dropdown-menu') : null;
    var modalConfermaEliminaEl = document.getElementById('modalConfermaEliminaDocumento');
    var testoConfermaElimina = document.getElementById('testoConfermaEliminaDocumento');
    var btnConfermaElimina = document.getElementById('btnConfermaEliminaDocumento');
    if (!tabellaDocumenti || !modalEl || !modalBody || !modalConfermaEliminaEl || !testoConfermaElimina || !btnConfermaElimina) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    var modalConfermaEliminaBootstrap = new bootstrap.Modal(modalConfermaEliminaEl);
    // Snapshot del form vuoto usato da "+ Nuovo documento" per ripartire da uno stato pulito
    var formInizialeHTML = modalBody.innerHTML;

    // Bordo bianco sul "+" flottante quando scorre sopra il footer di pagina (creaAggiornatoreSuSfondoBlu in sovrapposizione-sfondo-blu.js)
    if (btnNuovo) {
        creaAggiornatoreSuSfondoBlu(function () {
            return btnNuovo;
        }, 'su-sfondo-blu');
    }

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

    // null = nessuna sezione selezionata nel filtro, altrimenti pk della sezione scelta come stringa
    var categoriaFiltrataPk = null;

    // Mostra solo le righe di "#tabella-documenti" della sezione filtrata
    function applicaFiltroSezione() {
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

    // null = nessuna eliminazione in sospeso; altrimenti la funzione da eseguire alla conferma nel modal
    var azioneEliminaConfermata = null;

    // Mostra il modal di conferma con "messaggio"; esegue "azione" solo se l'utente conferma
    function chiediConfermaElimina(messaggio, azione) {
        testoConfermaElimina.textContent = messaggio;
        azioneEliminaConfermata = azione;
        modalConfermaEliminaBootstrap.show();
    }

    btnConfermaElimina.addEventListener('click', function () {
        modalConfermaEliminaBootstrap.hide();
        if (azioneEliminaConfermata) {
            azioneEliminaConfermata();
        }
    });

    modalConfermaEliminaEl.addEventListener('hidden.bs.modal', function () {
        azioneEliminaConfermata = null;
    });

    // Chiede conferma con un pop-up ed elimina la categoria
    function eliminaCategoria(item) {
        var messaggio = 'Vuoi cancellare la cartella "' + item.dataset.nomeCategoria + '" e i suoi file?';
        chiediConfermaElimina(messaggio, function () {
            postConCsrfEAggiornaTabella(item.dataset.urlEliminaCategoria);
        });
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

    function aggiornaTabella(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html.trim();
        var nuovaTabella = tmp.querySelector('#tabella-documenti');
        if (!nuovaTabella) {
            // Risposta inattesa (es. pagina di login intera): reload completo
            window.location.reload();
            return;
        }

        // Applica il nuovo HTML preservando i nodi invariati, con fallback a innerHTML diretto
        if (window.Idiomorph) {
            Idiomorph.morph(tabellaDocumenti, nuovaTabella.innerHTML, { morphStyle: 'innerHTML' });
        } else {
            tabellaDocumenti.innerHTML = nuovaTabella.innerHTML;
        }

        var opzioniCategoria = tmp.querySelector('#opzioniCategoriaAggiornate');
        if (opzioniCategoria) {
            aggiornaOpzioniCategoriaNelFormVuoto(opzioniCategoria.innerHTML);
        }

        applicaFiltroSezione();
    }

    function salvaDocumento(f) {
        fetch(f.action, {
            method: 'POST',
            body: new FormData(f),
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (response.ok) {
                    aggiornaTabella(html);
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

    function postConCsrfEAggiornaTabella(url) {
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
                    aggiornaTabella(html);
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
        valutaBottoneSalva();
        modalBootstrap.show();
    }

    // Chiede conferma con un pop-up ed elimina il documento scelto
    function eliminaDocumentoScelto(riga) {
        var nome = riga.dataset.nomeFile || 'questo documento';
        chiediConfermaElimina('Vuoi cancellare il file "' + nome + '"?', function () {
            postConCsrfEAggiornaTabella(riga.dataset.urlEliminaDocumento);
        });
    }

    sincronizzaStatoCategoria();

    if (btnNuovo) {
        btnNuovo.addEventListener('click', function () {
            fileAttualeInModifica = null;
            revocaBlobFileScelto();
            modalBody.innerHTML = formInizialeHTML;
            nomeFileOriginale = '';
            categoriaOriginalePk = '';
            sincronizzaStatoCategoria();
            valutaBottoneSalva();
        });
    }

    // Click su una riga: apre il pop-up di modifica, tranne su link e bottoni azione
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
