// Widget del carrello fluttuante: bottone con badge (sempre visibile
// tranne sulla pagina carrello, dove il widget non viene mai renderizzato -
// vedi base.html) che si espande in un pannello con la lista dei prodotti
// nel carrello. Ogni azione (aumenta/diminuisci/rimuovi dal pannello, o
// un'aggiunta fatta altrove nel sito via aggiungi-al-carrello.js)
// sostituisce l'intero contenitore con l'HTML gia' pronto restituito dal
// server (stesso pattern di gestione-avvisi.js), cosi' badge e lista
// restano sempre coerenti con lo stato reale - incluso il caso "primo
// prodotto aggiunto" (il widget compare per la prima volta) e "ultimo
// prodotto rimosso" (il widget sparisce, il partial non produce output).
(function () {
    var container = document.getElementById('carrelloFlottanteContainer');
    if (!container) {
        return;
    }

    function pannelloAperto() {
        var pannello = document.getElementById('pannelloCarrelloFlottante');
        return !!pannello && !pannello.classList.contains('d-none');
    }

    window.aggiornaCarrelloFlottante = function (html, mantieniAperto) {
        var eraAperto = mantieniAperto || pannelloAperto();
        container.innerHTML = html;
        if (eraAperto) {
            var pannello = document.getElementById('pannelloCarrelloFlottante');
            if (pannello) {
                pannello.classList.remove('d-none');
            }
        }
    };

    container.addEventListener('click', function (event) {
        var bottone = event.target.closest('#bottoneCarrelloFlottante');
        if (bottone) {
            var pannello = document.getElementById('pannelloCarrelloFlottante');
            if (pannello) {
                pannello.classList.toggle('d-none');
            }
            return;
        }

        var chiudi = event.target.closest('#chiudiCarrelloFlottante');
        if (chiudi) {
            var pannelloDaChiudere = document.getElementById('pannelloCarrelloFlottante');
            if (pannelloDaChiudere) {
                pannelloDaChiudere.classList.add('d-none');
            }
            return;
        }

        var azione = event.target.closest('.btn-aumenta-flottante, .btn-diminuisci-flottante, .btn-rimuovi-flottante');
        if (!azione) {
            return;
        }
        if (azione.dataset.azioneInCorso === 'true') {
            return;
        }
        azione.dataset.azioneInCorso = 'true';

        var tokenInput = container.querySelector('[name=csrfmiddlewaretoken]');
        var corpo = new FormData();
        if (tokenInput) {
            corpo.append('csrfmiddlewaretoken', tokenInput.value);
        }

        fetch(azione.dataset.url, {
            method: 'POST',
            body: corpo,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.text().then(function (html) {
                if (!response.ok) {
                    window.location.reload();
                    return;
                }
                window.aggiornaCarrelloFlottante(html, true);
            });
        }).catch(function () {
            window.location.reload();
        });
    });
})();
