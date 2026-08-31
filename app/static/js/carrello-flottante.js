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

    // Stesso controllo di sovrapposizione gia' usato dal cerchio della
    // ricerca in prodotti_card.html (vedi "siSovrappongono"/
    // "finisceSuSfondoBlu" li'): serve anche in 2D (non solo verticale)
    // per le card prodotto, disposte anche in colonne (griglia_prodotti.html,
    // "col-6"), a differenza del footer di pagina che e' sempre a piena
    // larghezza
    function siSovrappongono(a, b) {
        return a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
    }

    // Il bottone (fisso in basso a destra) prende il bordo bianco quando
    // finisce sopra uno sfondo blu navbar: il footer della pagina (una
    // volta che, scorrendo, arriva dietro di lui - resta sempre dietro
    // essendo l'ultimo elemento della pagina, quindi basta confrontare il
    // suo bordo superiore con quello inferiore del bottone) oppure il
    // footer blu pieno di una card prodotto (".card-footer-btn" in
    // prodotti.css, presente solo su prodotti_card.html - "querySelectorAll"
    // torna una lista vuota altrove, innocuo)
    function bottoneSuSfondoBlu(rigaBottone) {
        var footer = document.querySelector('.site-footer');
        if (footer && footer.getBoundingClientRect().top < rigaBottone.bottom) {
            return true;
        }
        var footerCard = document.querySelectorAll('.card.card-prodotto .card-footer-btn');
        for (var i = 0; i < footerCard.length; i++) {
            if (siSovrappongono(footerCard[i].getBoundingClientRect(), rigaBottone)) {
                return true;
            }
        }
        return false;
    }

    function aggiornaBordoSuFooter() {
        var bottone = document.getElementById('bottoneCarrelloFlottante');
        if (!bottone) {
            return;
        }
        bottone.classList.toggle('su-footer', bottoneSuSfondoBlu(bottone.getBoundingClientRect()));
    }

    window.aggiornaCarrelloFlottante = function (html, mantieniAperto) {
        var eraAperto = mantieniAperto || pannelloAperto();
        container.innerHTML = html;
        if (eraAperto) {
            var pannello = document.getElementById('pannelloCarrelloFlottante');
            if (pannello) {
                pannello.classList.remove('d-none');
            }
            // Il bottone appena inserito e' HTML nuovo dal server: non porta
            // con se' la classe che ne segnava lo stato "aperto" (aggiunta
            // via JS, non dal template) - va riapplicata qui, altrimenti
            // tornerebbe al colore di default ad ogni azione (aumenta/
            // diminuisci/rimuovi) pur restando il pannello aperto
            var bottoneNuovo = document.getElementById('bottoneCarrelloFlottante');
            if (bottoneNuovo) {
                bottoneNuovo.classList.add('carrello-flottante-attivo');
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
                // Colore del bottone legato esplicitamente allo stato del
                // pannello (aperto/chiuso), non lasciato a hover/focus del
                // browser - altrimenti un secondo click per chiudere (che è
                // comunque un click, quindi anch'esso mette a fuoco il
                // bottone) potrebbe non far tornare il colore a quello di
                // default in modo affidabile
                bottone.classList.toggle('carrello-flottante-attivo', !pannello.classList.contains('d-none'));
            }
            return;
        }

        var azione = event.target.closest('.btn-aumenta-flottante, .btn-diminuisci-flottante, .btn-rimuovi-flottante, .btn-svuota-flottante');
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
