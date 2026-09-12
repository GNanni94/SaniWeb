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
    if (!tabellaDocumenti || !modalEl || !modalBody) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);

    // Bordo bianco sul "+" flottante quando scorre sopra il footer di pagina (creaAggiornatoreSuSfondoBlu in sovrapposizione-sfondo-blu.js)
    if (btnNuovo) {
        creaAggiornatoreSuSfondoBlu(function () {
            return btnNuovo;
        }, 'su-sfondo-blu');
    }

    function formCorrente() {
        return document.getElementById('form-documento');
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

    // Rilegge il <ul> del filtro ogni volta: con "hx-swap-oob=true" il nodo
    // viene sostituito per intero ad ogni aggiornamento (outerHTML), quindi
    // un riferimento salvato una volta sola diventerebbe stale
    function menuFiltroSezione() {
        return filtroSezioneWrapper ? filtroSezioneWrapper.querySelector('.filtro-dropdown-menu') : null;
    }

    // Marca come attiva la voce del filtro scelta
    function impostaVoceFiltroSezioneAttiva(voceScelta) {
        var menu = menuFiltroSezione();
        if (!menu) {
            return;
        }
        var voci = menu.querySelectorAll('.filtro-dropdown-item');
        for (var i = 0; i < voci.length; i++) {
            voci[i].classList.toggle('active', voci[i] === voceScelta);
        }
    }

    function aggiornaClasseFiltroSezioneAttivo() {
        var menu = menuFiltroSezione();
        if (!filtroSezioneWrapper || !menu) {
            return;
        }
        var iconaFiltro = filtroSezioneWrapper.querySelector('.filtro-icon-overlay');
        var primaVoce = menu.querySelector('.filtro-dropdown-item');
        if (!iconaFiltro || !primaVoce) {
            return;
        }
        var attivo = !primaVoce.classList.contains('active');
        iconaFiltro.classList.toggle('bi-funnel-fill', attivo);
        iconaFiltro.classList.toggle('bi-funnel', !attivo);
    }

    // Delegazione sul wrapper (stabile, mai sostituito), non sul <ul> del
    // menu: quello viene ricreato ad ogni aggiornamento del filtro (vedi menuFiltroSezione())
    if (filtroSezioneWrapper) {
        filtroSezioneWrapper.addEventListener('click', function (event) {
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

    // Ricostruisce la voce "attiva" del filtro dopo che il menu e' stato
    // rigenerato dal server (arriva sempre con "MOSTRA TUTTO" attivo di
    // default, il server non sa nulla del filtro scelto lato client). Se
    // la categoria filtrata e' stata eliminata nel frattempo, torna a
    // "MOSTRA TUTTO"
    function riapplicaVoceFiltroSezioneAttiva() {
        var menu = menuFiltroSezione();
        if (!menu) {
            return;
        }
        var selettore = '.filtro-dropdown-item[data-categoria-pk="' + (categoriaFiltrataPk || '') + '"]';
        var voce = menu.querySelector(selettore);
        if (!voce) {
            categoriaFiltrataPk = null;
            voce = menu.querySelector('.filtro-dropdown-item[data-categoria-pk=""]');
            applicaFiltroSezione();
        }
        if (voce) {
            impostaVoceFiltroSezioneAttiva(voce);
        }
        aggiornaClasseFiltroSezioneAttivo();
    }

    // Il menu "Filtra per sezione" arriva sempre come frammento
    // "out-of-band" dopo un salvataggio riuscito o un'eliminazione:
    // "htmx:oobAfterSwap" scatta per ogni swap fuori dal bersaglio
    // principale della richiesta. L'outerHTML swap sostituisce il <ul> con
    // un nodo nuovo: se il dropdown Bootstrap sul bottone era gia' stato
    // aperto una volta, la sua istanza resta agganciata al <ul> vecchio
    // (rimosso dal DOM) e smette di rispondere ai click, quindi va
    // disposta qui per farla ricreare al prossimo click sul <ul> nuovo
    document.addEventListener('htmx:oobAfterSwap', function (event) {
        if (event.detail.target && event.detail.target.id === 'menuFiltroSezioneDocumenti') {
            var btnFiltro = document.getElementById('filtroSezioneDocumenti');
            var dropdownEsistente = btnFiltro ? bootstrap.Dropdown.getInstance(btnFiltro) : null;
            if (dropdownEsistente) {
                dropdownEsistente.dispose();
            }
            riapplicaVoceFiltroSezioneAttiva();
        }
    });

    sincronizzaStatoCategoria();

    // "+ Nuovo documento" e "Modifica" caricano nel modal il form dal
    // server via "hx-get" (rispettivamente form vuoto e precompilato): il
    // modal viene aperto solo dopo che il contenuto e' arrivato. Lo stesso
    // evento copre anche il form ri-mostrato nel modal dopo un errore di
    // validazione del salvataggio (hx-post + HX-Retarget su un 400): in
    // quel caso pero' "nomeFileOriginale"/"categoriaOriginalePk" restano
    // quelli letti alla apertura originale, altrimenti il confronto di
    // valutaBottoneSalva() ripartirebbe dai valori (con errori) appena
    // tentati.
    // La cattura dei valori resta su "afterSwap", ma il ripristino visivo
    // (icona/link del file, che tocca "class") va fatto su "afterSettle":
    // passato il settle delay di default (20ms) htmx reimposta da solo gli
    // attributi in htmx.config.attributesToSettle (class/style/width/
    // height) al valore ricevuto dal server, cancellando nel frattempo
    // qualunque classe cambiata "a mano" durante afterSwap.
    var eGetFormCorrente = false;
    document.addEventListener('htmx:afterSwap', function (event) {
        if (event.detail.target !== modalBody) {
            return;
        }
        var f = formCorrente();
        if (!f) {
            return;
        }
        eGetFormCorrente = event.detail.requestConfig && event.detail.requestConfig.verb === 'get';
        if (eGetFormCorrente) {
            revocaBlobFileScelto();
            fileAttualeInModifica = null;
            nomeFileOriginale = f.elements['nome_file'] ? f.elements['nome_file'].value : '';
            categoriaOriginalePk = f.elements['categoria'] ? f.elements['categoria'].value : '';
        }
    });

    document.addEventListener('htmx:afterSettle', function (event) {
        if (event.detail.target !== modalBody) {
            return;
        }
        var f = formCorrente();
        if (!f) {
            return;
        }
        sincronizzaStatoCategoria();
        if (eGetFormCorrente) {
            if (f.dataset.fileUrl) {
                fileAttualeInModifica = { url: f.dataset.fileUrl, nome: f.dataset.fileNome };
                impostaCampoFileEsistente(fileAttualeInModifica.url, fileAttualeInModifica.nome);
            }
        } else if (fileAttualeInModifica) {
            impostaCampoFileEsistente(fileAttualeInModifica.url, fileAttualeInModifica.nome);
        } else if (fileNuovoScelto) {
            // Reimbusta il file scelto nel nuovo <input type=file> tramite DataTransfer
            var inputFile = f.elements['file'];
            if (inputFile) {
                var trasferimento = new DataTransfer();
                trasferimento.items.add(fileNuovoScelto);
                inputFile.files = trasferimento.files;
            }
            impostaCampoFileEsistente(blobFileScelto, fileNuovoScelto.name);
        }
        valutaBottoneSalva();
        if (eGetFormCorrente) {
            modalBootstrap.show();
        }
    });

    // Il morph di "#tabella-documenti" (dopo un salvataggio o
    // un'eliminazione, tutti via hx-post) e' gestito nativamente
    // dall'estensione idiomorph di htmx: il filtro sezione, che nasconde
    // le righe via classe "d-none" lato client, va quindi riapplicato a
    // mano sulle righe appena arrivate
    document.addEventListener('htmx:afterSwap', function (event) {
        if (event.detail.target === tabellaDocumenti) {
            applicaFiltroSezione();
        }
    });

    // Ricarica la pagina se il caricamento di "Modifica" (richiesta GET)
    // fallisce; gli errori di eliminazione (richieste POST, gestite via
    // hx-post/hx-confirm sui bottoni in tabella_documenti.html) restano sul
    // comportamento di default di htmx
    tabellaDocumenti.addEventListener('htmx:responseError', function (event) {
        if (event.detail.requestConfig && event.detail.requestConfig.verb === 'get') {
            window.location.reload();
        }
    });

    // Forza lo swap sul modal per gli errori di validazione (400): htmx
    // non applica lo swap di default fuori dal range 2xx, e
    // "htmx:beforeSwap" scatta sul bersaglio originale del form
    // ("#tabella-documenti") anche quando l'header "HX-Retarget" lo cambia,
    // quindi il listener resta su "document" (antenato di entrambi)
    document.addEventListener('htmx:beforeSwap', function (event) {
        if (event.detail.target === modalBody) {
            event.detail.shouldSwap = true;
        }
    });

    // Chiude il modal solo dopo un salvataggio riuscito (2xx)
    modalBody.addEventListener('htmx:afterRequest', function (event) {
        var status = event.detail.xhr.status;
        if (status >= 200 && status < 300) {
            modalBootstrap.hide();
        }
    });

    // Ricarica la pagina per un errore di salvataggio diverso da 400
    // (errori di validazione, gestiti sopra)
    modalBody.addEventListener('htmx:responseError', function (event) {
        if (event.detail.xhr.status !== 400) {
            window.location.reload();
        }
    });

    // Ricarica la pagina se la richiesta di salvataggio non arriva a
    // destinazione (rete assente, server giu')
    modalBody.addEventListener('htmx:sendError', function () {
        window.location.reload();
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
                f.elements['nome_file'].value = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
            }
        }
    });
})();
