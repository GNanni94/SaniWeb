// Upload manuale dell'immagine di un prodotto dalla dashboard admin:
// click su una riga apre un pop-up con anteprima (FileReader, lato
// client, nessuna richiesta di rete) prima di confermare l'upload via
// fetch - stesso pattern AJAX gia' usato in gestione-avvisi.js (token
// CSRF letto da un campo nascosto gia' presente nella pagina)
(function () {
    var tabellaContainer = document.getElementById('corpo-tabella-prodotti-senza-immagine');
    var tabella = document.getElementById('tabella-prodotti-senza-immagine');
    var messaggioVuoto = document.getElementById('messaggio-nessun-prodotto');
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
    if (!tabellaContainer || !tabella || !messaggioVuoto || !formCsrf || !modalEl || !previewCodice
        || !previewUnita || !previewTitolo || !previewDescrizione
        || !input || !btnScegli || !preview || !errore || !btnConferma) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    var rigaCorrente = null;

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
                if (!tabellaContainer.querySelector('tr')) {
                    tabella.classList.add('d-none');
                    messaggioVuoto.classList.remove('d-none');
                }
            })
            .catch(function () {
                errore.textContent = 'Errore di rete, riprova.';
                btnConferma.disabled = false;
            });
    });

    // Ordinamento per colonna Categoria: indipendente dal resto (guardia
    // separata), cosi' se questo elemento manca il resto della pagina
    // (apertura del pop-up, upload) continua a funzionare comunque.
    var colonnaCategoria = document.getElementById('colonnaCategoria');
    if (colonnaCategoria) {
        var ordineCategoriaAscendente = true;

        function ordinaPerCategoria() {
            var righe = Array.prototype.slice.call(tabellaContainer.querySelectorAll('tr'));
            righe.sort(function (a, b) {
                var categoriaA = a.children[2].textContent.trim().toLowerCase();
                var categoriaB = b.children[2].textContent.trim().toLowerCase();
                if (categoriaA < categoriaB) {
                    return ordineCategoriaAscendente ? -1 : 1;
                }
                if (categoriaA > categoriaB) {
                    return ordineCategoriaAscendente ? 1 : -1;
                }
                return 0;
            });
            righe.forEach(function (riga) {
                tabellaContainer.appendChild(riga);
            });
            colonnaCategoria.setAttribute('aria-sort', ordineCategoriaAscendente ? 'ascending' : 'descending');
            ordineCategoriaAscendente = !ordineCategoriaAscendente;
        }

        colonnaCategoria.addEventListener('click', ordinaPerCategoria);
        colonnaCategoria.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            event.preventDefault();
            ordinaPerCategoria();
        });
    }
})();
