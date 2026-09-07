// Upload manuale dell'immagine di un prodotto dalla dashboard admin: il
// click su una riga apre un pop-up con anteprima (FileReader) prima di
// confermare l'upload via fetch
(function () {
    var tabellaContainer = document.getElementById('corpo-tabella-prodotti-senza-immagine');
    var tabella = document.getElementById('tabella-prodotti-senza-immagine');
    var messaggioVuoto = document.getElementById('messaggio-nessun-prodotto');
    var inputRicerca = document.getElementById('inputCercaCodiceProdotto');
    var messaggioNessunRisultato = document.getElementById('messaggio-nessun-risultato-ricerca');
    var ricercaWrapper = document.getElementById('ricercaCodiceWrapper');
    var ricercaToggleBtn = document.getElementById('toggleRicercaCodiceProdotto');
    var filtroWrapper = document.getElementById('filtroCategoriaProdottiWrapper');
    var listaFiltro = filtroWrapper ? filtroWrapper.querySelector('.filtro-dropdown-menu') : null;
    var formCsrf = document.getElementById('csrf-dashboard-prodotti');
    var modalEl = document.getElementById('modalCaricaImmagineProdotto');
    var previewCodice = document.getElementById('previewProdottoCodice');
    var previewUnita = document.getElementById('previewProdottoUnita');
    var previewTitolo = document.getElementById('previewProdottoTitolo');
    var previewDescrizione = document.getElementById('previewProdottoDescrizione');
    var input = document.getElementById('inputImmagineProdottoModal');
    var btnScegli = document.getElementById('btnScegliImmagineProdotto');
    var preview = document.getElementById('previewImmagineProdotto');
    var errore = document.getElementById('erroreCaricaImmagineProdotto');
    var btnConferma = document.getElementById('btnConfermaCaricaImmagineProdotto');
    if (!tabellaContainer || !tabella || !messaggioVuoto || !inputRicerca || !messaggioNessunRisultato
        || !ricercaWrapper || !ricercaToggleBtn
        || !formCsrf || !modalEl || !previewCodice
        || !previewUnita || !previewTitolo || !previewDescrizione
        || !input || !btnScegli || !preview || !errore || !btnConferma) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    var rigaCorrente = null;

    // null = nessuna categoria selezionata nel filtro, altrimenti pk della
    // categoria scelta come stringa
    var categoriaSelezionataPk = null;

    // Filtra le righe per codice prodotto e per categoria selezionata
    function applicaFiltroRicerca() {
        var testo = inputRicerca.value.trim().toLowerCase();
        var righe = tabellaContainer.querySelectorAll('tr');
        var visibili = 0;
        righe.forEach(function (riga) {
            var corrispondeTesto = riga.dataset.codice.toLowerCase().indexOf(testo) !== -1;
            var corrispondeCategoria = categoriaSelezionataPk === null || riga.dataset.categoriaPk === categoriaSelezionataPk;
            var corrisponde = corrispondeTesto && corrispondeCategoria;
            riga.classList.toggle('d-none', !corrisponde);
            if (corrisponde) {
                visibili++;
            }
        });
        var nessunProdotto = righe.length === 0;
        tabella.classList.toggle('d-none', nessunProdotto || visibili === 0);
        messaggioVuoto.classList.toggle('d-none', !nessunProdotto);
        messaggioNessunRisultato.classList.toggle('d-none', nessunProdotto || visibili !== 0);

        // Richiama aggiornaBordoSuSfondoBlu perche' nascondere/mostrare righe
        // cambia l'altezza della pagina senza generare un evento scroll/resize
        aggiornaBordoSuSfondoBlu();

        // Nasconde le pillole di ricerca/filtro quando l'ultimo prodotto viene rimosso
        ricercaWrapper.classList.toggle('d-none', nessunProdotto);
        if (filtroWrapper) {
            filtroWrapper.classList.toggle('d-none', nessunProdotto);
        }
    }

    inputRicerca.addEventListener('input', applicaFiltroRicerca);

    // Marca come attiva la voce del filtro scelta
    function impostaVoceFiltroAttiva(voceScelta) {
        if (!listaFiltro) {
            return;
        }
        var voci = listaFiltro.querySelectorAll('.filtro-dropdown-item');
        for (var i = 0; i < voci.length; i++) {
            voci[i].classList.toggle('active', voci[i] === voceScelta);
        }
    }

    function aggiornaClasseFiltroAttivo() {
        if (!filtroWrapper || !listaFiltro) {
            return;
        }
        var iconaFiltro = filtroWrapper.querySelector('.filtro-icon-overlay');
        var primaVoce = listaFiltro.querySelector('.filtro-dropdown-item');
        if (!iconaFiltro || !primaVoce) {
            return;
        }
        var attivo = !primaVoce.classList.contains('active');
        iconaFiltro.classList.toggle('bi-funnel-fill', attivo);
        iconaFiltro.classList.toggle('bi-funnel', !attivo);
    }

    if (listaFiltro) {
        listaFiltro.addEventListener('click', function (event) {
            var voce = event.target.closest('.filtro-dropdown-item');
            if (!voce) {
                return;
            }
            event.preventDefault();
            impostaVoceFiltroAttiva(voce);
            aggiornaClasseFiltroAttivo();
            categoriaSelezionataPk = voce.dataset.categoriaPk || null;
            applicaFiltroRicerca();
        });
        aggiornaClasseFiltroAttivo();
    }

    // Da telefono la lente si apre al click e mette il focus nel campo, si
    // richiude da sola cliccando fuori se e' rimasto vuoto. Da desktop il
    // campo e' gia' sempre aperto, il click si limita a mettere il focus
    ricercaToggleBtn.addEventListener('click', function () {
        if (ricercaWrapper.classList.contains('ricerca-espansa')) {
            return;
        }
        ricercaWrapper.classList.add('ricerca-espansa');
        ricercaToggleBtn.setAttribute('aria-expanded', 'true');
        inputRicerca.focus();
    });

    document.addEventListener('click', function (event) {
        if (!ricercaWrapper.classList.contains('ricerca-espansa') || ricercaWrapper.contains(event.target)) {
            return;
        }
        if (inputRicerca.value.trim() === '') {
            ricercaWrapper.classList.remove('ricerca-espansa');
            ricercaToggleBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Bordo bianco quando il cerchio di ricerca finisce sopra il footer di pagina
    var aggiornaBordoSuSfondoBlu = creaAggiornatoreSuSfondoBlu(function () {
        return ricercaWrapper;
    }, 'su-sfondo-blu');

    function tokenCsrf() {
        var tokenInput = formCsrf.querySelector('[name=csrfmiddlewaretoken]');
        return tokenInput ? tokenInput.value : '';
    }

    function apriModal(riga) {
        rigaCorrente = riga;
        previewCodice.textContent = riga.dataset.codice;
        previewUnita.textContent = riga.dataset.unitaDiMisura;
        previewTitolo.textContent = riga.dataset.nome;
        if (riga.dataset.descrizione) {
            previewDescrizione.textContent = riga.dataset.descrizione;
            previewDescrizione.classList.remove('d-none');
        } else {
            previewDescrizione.textContent = '';
            previewDescrizione.classList.add('d-none');
        }
        input.value = '';
        preview.src = preview.dataset.defaultSrc;
        errore.textContent = '';
        btnConferma.disabled = true;
        btnConferma.dataset.urlCarica = riga.dataset.urlCarica;
        modalBootstrap.show();
    }

    tabellaContainer.addEventListener('click', function (event) {
        var riga = event.target.closest('tr');
        if (!riga) {
            return;
        }
        apriModal(riga);
    });

    tabellaContainer.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }
        var riga = event.target.closest('tr');
        if (!riga) {
            return;
        }
        event.preventDefault();
        apriModal(riga);
    });

    btnScegli.addEventListener('click', function () {
        input.click();
    });

    input.addEventListener('change', function () {
        if (!input.files.length) {
            return;
        }
        errore.textContent = '';
        var lettore = new FileReader();
        lettore.onload = function () {
            preview.src = lettore.result;
            btnConferma.disabled = false;
        };
        lettore.onerror = function () {
            errore.textContent = 'Impossibile leggere il file, riprova.';
        };
        lettore.readAsDataURL(input.files[0]);
    });

    btnConferma.addEventListener('click', function () {
        if (!input.files.length || !rigaCorrente) {
            return;
        }
        var corpo = new FormData();
        corpo.append('csrfmiddlewaretoken', tokenCsrf());
        corpo.append('immagine', input.files[0]);

        btnConferma.disabled = true;

        fetch(btnConferma.dataset.urlCarica, {
            method: 'POST',
            body: corpo,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (dati) {
                if (!dati.ok) {
                    errore.textContent = dati.error || 'Caricamento fallito.';
                    btnConferma.disabled = false;
                    return;
                }
                modalBootstrap.hide();
                var rigaDaRimuovere = rigaCorrente;
                rigaCorrente = null;
                rigaDaRimuovere.remove();
                applicaFiltroRicerca();
            })
            .catch(function () {
                errore.textContent = 'Errore di rete, riprova.';
                btnConferma.disabled = false;
            });
    });

})();
