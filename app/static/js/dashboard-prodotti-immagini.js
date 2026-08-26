// Upload manuale dell'immagine di un prodotto dalla dashboard admin:
// click su una riga apre un pop-up con anteprima (FileReader, lato
// client, nessuna richiesta di rete) prima di confermare l'upload via
// fetch - stesso pattern AJAX gia' usato in gestione-avvisi.js (token
// CSRF letto da un campo nascosto gia' presente nella pagina)
(function () {
    var tabellaContainer = document.getElementById('corpo-tabella-prodotti-senza-immagine');
    var tabella = document.getElementById('tabella-prodotti-senza-immagine');
    var messaggioVuoto = document.getElementById('messaggio-nessun-prodotto');
    var inputRicerca = document.getElementById('inputCercaCodiceProdotto');
    var messaggioNessunRisultato = document.getElementById('messaggio-nessun-risultato-ricerca');
    var ricercaWrapper = document.getElementById('ricercaCodiceWrapper');
    var ricercaToggleBtn = document.getElementById('toggleRicercaCodiceProdotto');
    var colonnaCodiceTh = document.getElementById('colonnaCodice');
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
        || !ricercaWrapper || !ricercaToggleBtn || !colonnaCodiceTh
        || !formCsrf || !modalEl || !previewCodice
        || !previewUnita || !previewTitolo || !previewDescrizione
        || !input || !btnScegli || !preview || !errore || !btnConferma) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    var rigaCorrente = null;

    // Filtro live per codice prodotto (match "contiene", case-insensitive):
    // riusata anche dopo un upload riuscito (che rimuove una riga), cosi'
    // il conteggio di righe visibili resta corretto anche a filtro attivo
    function applicaFiltroRicerca() {
        var testo = inputRicerca.value.trim().toLowerCase();
        var righe = tabellaContainer.querySelectorAll('tr');
        var visibili = 0;
        righe.forEach(function (riga) {
            var corrisponde = riga.dataset.codice.toLowerCase().indexOf(testo) !== -1;
            riga.classList.toggle('d-none', !corrisponde);
            if (corrisponde) {
                visibili++;
            }
        });
        var nessunProdotto = righe.length === 0;
        tabella.classList.toggle('d-none', nessunProdotto || visibili === 0);
        messaggioVuoto.classList.toggle('d-none', !nessunProdotto);
        messaggioNessunRisultato.classList.toggle('d-none', nessunProdotto || visibili !== 0);

        // Nascondere/mostrare righe cambia l'altezza della pagina (quindi
        // se il footer finisce sotto il cerchio fluttuante, vedi
        // "aggiornaBordoSuSfondoBlu" piu' sotto) senza generare da solo
        // nessun evento "scroll"/"resize" della finestra - va quindi
        // richiamata esplicitamente anche da qui, altrimenti il bordo
        // resterebbe quello di prima finche' non si scrolla/ridimensiona
        aggiornaBordoSuSfondoBlu();

        // Nasconde anche la pillola di ricerca quando l'ultimo prodotto
        // viene rimosso (upload riuscito senza ricaricare la pagina): senza
        // questo restava visibile, diversamente da un caricamento fresco
        // della stessa pagina ormai vuota (vedi "{% if not prodotti %}" nel
        // template)
        ricercaWrapper.classList.toggle('d-none', nessunProdotto);
    }

    inputRicerca.addEventListener('input', applicaFiltroRicerca);

    // Da telefono la lente si apre al click e mette il focus nel campo (il
    // filtro e' gia' live mentre si scrive, quindi un secondo click sulla
    // lente gia' aperta non deve fare nulla). Si richiude da sola cliccando
    // fuori se e' rimasto vuoto - stesso comportamento di prodotti_card.html/
    // prodotti_tabella.html. Da desktop il campo e' invece gia' sempre
    // aperto vicino al titolo (vedi CSS ">= 576px" in prodotti.css): la
    // classe ".ricerca-espansa" aggiunta qui non ha li' alcun effetto
    // visivo (regole solo sotto i 576px), il click si limita a mettere il
    // focus nel campo gia' visibile
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

    // Bordo bianco (".su-sfondo-blu" in prodotti.css) quando il cerchio
    // finisce sopra il footer di pagina - stesso principio di
    // prodotti_card.html/prodotti_tabella.html (qui non ci sono card con un
    // proprio footer blu, solo il footer di pagina)
    function aggiornaBordoSuSfondoBlu() {
        var footer = document.querySelector('.site-footer');
        var suSfondoBlu = !!footer && footer.getBoundingClientRect().top < ricercaWrapper.getBoundingClientRect().bottom;
        ricercaWrapper.classList.toggle('su-sfondo-blu', suSfondoBlu);
    }

    aggiornaBordoSuSfondoBlu();
    window.addEventListener('scroll', aggiornaBordoSuSfondoBlu, { passive: true });
    window.addEventListener('resize', aggiornaBordoSuSfondoBlu);

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

    // Ordinamento per colonna (Codice, Categoria, ...): ogni colonna
    // ordinabile e' indipendente dal resto (guardia separata sull'elemento),
    // cosi' se uno di questi header manca il resto della pagina (apertura
    // del pop-up, upload) continua a funzionare comunque.
    function abilitaOrdinamentoColonna(idIntestazione, indiceColonna) {
        var intestazione = document.getElementById(idIntestazione);
        if (!intestazione) {
            return;
        }
        var ascendente = true;

        function ordina() {
            var righe = Array.prototype.slice.call(tabellaContainer.querySelectorAll('tr'));
            righe.sort(function (a, b) {
                var valoreA = a.children[indiceColonna].textContent.trim().toLowerCase();
                var valoreB = b.children[indiceColonna].textContent.trim().toLowerCase();
                if (valoreA < valoreB) {
                    return ascendente ? -1 : 1;
                }
                if (valoreA > valoreB) {
                    return ascendente ? 1 : -1;
                }
                return 0;
            });
            righe.forEach(function (riga) {
                tabellaContainer.appendChild(riga);
            });
            intestazione.setAttribute('aria-sort', ascendente ? 'ascending' : 'descending');
            ascendente = !ascendente;
        }

        intestazione.addEventListener('click', function (event) {
            ordina();
        });
        intestazione.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            event.preventDefault();
            ordina();
        });
    }

    abilitaOrdinamentoColonna('colonnaCodice', 0);
    abilitaOrdinamentoColonna('colonnaCategoria', 2);
})();
