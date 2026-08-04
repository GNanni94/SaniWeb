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
    var modalInfo = document.getElementById('modalCaricaImmagineProdottoInfo');
    var input = document.getElementById('inputImmagineProdottoModal');
    var btnScegli = document.getElementById('btnScegliImmagineProdotto');
    var previewContainer = document.getElementById('previewImmagineProdottoContainer');
    var preview = document.getElementById('previewImmagineProdotto');
    var errore = document.getElementById('erroreCaricaImmagineProdotto');
    var btnConferma = document.getElementById('btnConfermaCaricaImmagineProdotto');
    if (!tabellaContainer || !tabella || !messaggioVuoto || !formCsrf || !modalEl || !modalInfo
        || !input || !btnScegli || !previewContainer || !preview || !errore || !btnConferma) {
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
        modalInfo.textContent = riga.dataset.nome + ' (' + riga.dataset.codice + ')';
        input.value = '';
        preview.src = '';
        previewContainer.classList.add('d-none');
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
            previewContainer.classList.remove('d-none');
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
})();
