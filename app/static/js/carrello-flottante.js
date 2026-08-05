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

    // Il bottone (fisso in basso a destra) prende il bordo bianco non
    // appena il footer, scorrendo, arriva dietro di lui - da quel punto in
    // poi il footer resta sempre dietro (e' l'ultimo elemento della
    // pagina), quindi basta confrontare il bordo superiore del footer con
    // quello inferiore del bottone, senza bisogno di controllare anche il
    // bordo inferiore del footer
    function aggiornaBordoSuFooter() {
        var bottone = document.getElementById('bottoneCarrelloFlottante');
        var footer = document.querySelector('.site-footer');
        if (!bottone || !footer) {
            return;
        }
        var rigaFooter = footer.getBoundingClientRect();
        var rigaBottone = bottone.getBoundingClientRect();
        bottone.classList.toggle('su-footer', rigaFooter.top < rigaBottone.bottom);
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
        // Il bottone appena inserito parte sempre senza ".su-footer": va
        // ricalcolato subito, altrimenti resterebbe senza bordo finche' non
        // arriva il prossimo scroll/resize anche se la pagina e' gia' ferma
        // sul footer
        aggiornaBordoSuFooter();
    };

    aggiornaBordoSuFooter();
    window.addEventListener('scroll', aggiornaBordoSuFooter, { passive: true });
    window.addEventListener('resize', aggiornaBordoSuFooter);

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
