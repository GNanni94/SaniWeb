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
    var testoColonnaCodice = document.getElementById('testoColonnaCodice');
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
        || !ricercaWrapper || !ricercaToggleBtn || !colonnaCodiceTh || !testoColonnaCodice
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
    }

    inputRicerca.addEventListener('input', applicaFiltroRicerca);

    // Posizione originale del campo (dentro la pillola vicino al titolo),
    // per poterlo rimettere li' esattamente quando si esce dalla ricerca
    var inputHomeParent = inputRicerca.parentNode;
    var inputHomeNextSibling = inputRicerca.nextSibling;
    var sogliaTelefono = window.matchMedia('(max-width: 575.98px)');

    // Da telefono il tasto lente sparisce e il campo si sposta dentro
    // l'intestazione della tabella, al posto della scritta "Codice" (dove
    // c'e' piu' spazio per scrivere): da desktop il campo e' invece gia'
    // sempre aperto vicino al titolo (vedi CSS ">= 576px" in prodotti.css),
    // quindi li' la lente resta puramente decorativa
    function attivaRicercaMobile() {
        testoColonnaCodice.classList.add('d-none');
        colonnaCodiceTh.appendChild(inputRicerca);
        ricercaWrapper.classList.add('d-none');
        inputRicerca.focus();
    }

    function disattivaRicercaMobile() {
        inputHomeParent.insertBefore(inputRicerca, inputHomeNextSibling);
        ricercaWrapper.classList.remove('d-none');
        testoColonnaCodice.classList.remove('d-none');
    }

    ricercaToggleBtn.addEventListener('click', function () {
        if (!sogliaTelefono.matches) {
            inputRicerca.focus();
            return;
        }
        attivaRicercaMobile();
    });

    // Richiude il campo (e lo riporta vicino al titolo) se si clicca fuori
    // mentre e' vuoto - stesso "if vuoto" gia' usato altrove nel sito (vedi
    // prodotti_card.html), qui pero' il click che apre la ricerca (sul
    // tasto lente) va escluso esplicitamente: altrimenti lo stesso click
    // che ha appena spostato il campo nella colonna lo richiuderebbe
    // all'istante, perche' l'evento arriva su questo listener subito dopo
    document.addEventListener('click', function (event) {
        if (!colonnaCodiceTh.contains(inputRicerca)
            || event.target === inputRicerca
            || ricercaToggleBtn.contains(event.target)) {
            return;
        }
        if (inputRicerca.value.trim() === '') {
            disattivaRicercaMobile();
        }
    });

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

        // Guardia sul campo di ricerca: da telefono puo' finire dentro
        // questa stessa intestazione (colonnaCodice, vedi
        // "attivaRicercaMobile" sopra), quindi click/tasti fatti per
        // scrivere nel campo (spazio, invio) non devono ri-ordinare la
        // tabella ne' bloccare la digitazione
        intestazione.addEventListener('click', function (event) {
            if (event.target.tagName === 'INPUT') {
                return;
            }
            ordina();
        });
        intestazione.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            if (event.target.tagName === 'INPUT') {
                return;
            }
            event.preventDefault();
            ordina();
        });
    }

    abilitaOrdinamentoColonna('colonnaCodice', 0);
    abilitaOrdinamentoColonna('colonnaCategoria', 2);
})();
