// Upload manuale dell'immagine di un prodotto dalla dashboard admin:
// invio via fetch (niente reload pagina), la riga sparisce dalla
// tabella in caso di successo - stesso pattern gia' usato in
// gestione-avvisi.js (token CSRF letto da un campo nascosto gia'
// presente nella pagina)
(function () {
    var tabellaContainer = document.getElementById('corpo-tabella-prodotti-senza-immagine');
    var tabella = document.getElementById('tabella-prodotti-senza-immagine');
    var messaggioVuoto = document.getElementById('messaggio-nessun-prodotto');
    var formCsrf = document.getElementById('csrf-dashboard-prodotti');
    if (!tabellaContainer || !tabella || !messaggioVuoto || !formCsrf) {
        return;
    }

    function tokenCsrf() {
        var tokenInput = formCsrf.querySelector('[name=csrfmiddlewaretoken]');
        return tokenInput ? tokenInput.value : '';
    }

    tabellaContainer.addEventListener('click', function (event) {
        var bottone = event.target.closest('.btn-carica-immagine-prodotto');
        if (!bottone) {
            return;
        }
        var riga = bottone.closest('tr');
        var input = riga.querySelector('.input-immagine-prodotto');
        var errore = riga.querySelector('.errore-upload-prodotto');
        if (!input.files.length) {
            errore.textContent = 'Seleziona un file prima di caricare.';
            return;
        }
        errore.textContent = '';

        var corpo = new FormData();
        corpo.append('csrfmiddlewaretoken', tokenCsrf());
        corpo.append('immagine', input.files[0]);

        fetch(bottone.dataset.urlCarica, {
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
                    return;
                }
                riga.remove();
                if (!tabellaContainer.querySelector('tr')) {
                    tabella.classList.add('d-none');
                    messaggioVuoto.classList.remove('d-none');
                }
            })
            .catch(function () {
                errore.textContent = 'Errore di rete, riprova.';
            });
    });
})();
