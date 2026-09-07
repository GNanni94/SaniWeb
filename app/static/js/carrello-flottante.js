// Widget del carrello fluttuante: bottone che si espande in una lista dei
// prodotti, aggiornata con l'HTML restituito dal server ad ogni azione
(function () {
    var container = document.getElementById('carrelloFlottanteContainer');
    if (!container) {
        return;
    }

    // Ricarica la pagina se torna dalla bfcache (bottone indietro del browser dopo una modifica fatta in carrello.html)
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            window.location.reload();
        }
    });

    function listaElementiAperta() {
        var listaElementi = document.getElementById('listaElementiCarrelloFlottante');
        return !!listaElementi && !listaElementi.classList.contains('d-none');
    }

    // Bordo bianco quando il bottone finisce sopra uno sfondo blu (footer di pagina o di card)
    var aggiornaBordoSuFooter = creaAggiornatoreSuSfondoBlu(function () {
        return document.getElementById('bottoneCarrelloFlottante');
    }, 'su-footer', '.card.card-prodotto .card-footer-btn');

    window.aggiornaCarrelloFlottante = function (html, mantieniAperto) {
        var htmlTrim = html.trim();
        var listaElementiEsistente = document.getElementById('listaElementiCarrelloFlottante');

        // Aggiornamento in-place: sostituisce solo il contenuto della lista, lasciando intatti bottone e bordo
        if (htmlTrim && listaElementiEsistente) {
            var tmp = document.createElement('div');
            tmp.innerHTML = htmlTrim;
            var nuovaListaElementi = tmp.querySelector('#listaElementiCarrelloFlottante');
            if (nuovaListaElementi) {
                // Applica il nuovo contenuto con Idiomorph, fallback a innerHTML se non caricato
                if (window.Idiomorph) {
                    Idiomorph.morph(listaElementiEsistente, nuovaListaElementi.innerHTML, { morphStyle: 'innerHTML' });
                } else {
                    listaElementiEsistente.innerHTML = nuovaListaElementi.innerHTML;
                }
            }
            return;
        }

        // Altrimenti ricostruisce tutto da zero: primo prodotto aggiunto o carrello appena svuotato
        var eraAperto = mantieniAperto || listaElementiAperta();
        container.innerHTML = htmlTrim;
        if (eraAperto) {
            var listaElementi = document.getElementById('listaElementiCarrelloFlottante');
            if (listaElementi) {
                listaElementi.classList.remove('d-none');
            }
            // Riapplica la classe che segnava lo stato "aperto", persa nel nuovo HTML dal server
            var bottoneNuovo = document.getElementById('bottoneCarrelloFlottante');
            if (bottoneNuovo) {
                bottoneNuovo.classList.add('carrello-flottante-attivo');
            }
        }
        // Ricalcola subito il bordo sul nuovo bottone, che parte sempre senza ".su-footer"
        aggiornaBordoSuFooter();
    };

    // Fetch condivisa da bottoni +/-/rimuovi/svuota e dal campo quantita'
    function eseguiAzione(url, campiExtra) {
        var tokenInput = container.querySelector('[name=csrfmiddlewaretoken]');
        var corpo = new FormData();
        if (tokenInput) {
            corpo.append('csrfmiddlewaretoken', tokenInput.value);
        }
        if (campiExtra) {
            Object.keys(campiExtra).forEach(function (nome) {
                corpo.append(nome, campiExtra[nome]);
            });
        }

        return fetch(url, {
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
    }

    container.addEventListener('click', function (event) {
        // Chiude la lista prima di lasciar proseguire la navigazione verso la pagina carrello
        var linkCheckout = event.target.closest('.link-checkout-preventivo');
        if (linkCheckout) {
            var listaElementiCheckout = document.getElementById('listaElementiCarrelloFlottante');
            var bottoneCheckout = document.getElementById('bottoneCarrelloFlottante');
            if (listaElementiCheckout) {
                listaElementiCheckout.classList.add('d-none');
            }
            if (bottoneCheckout) {
                bottoneCheckout.classList.remove('carrello-flottante-attivo');
            }
            return;
        }

        var bottone = event.target.closest('#bottoneCarrelloFlottante');
        if (bottone) {
            var listaElementi = document.getElementById('listaElementiCarrelloFlottante');
            if (listaElementi) {
                listaElementi.classList.toggle('d-none');
                // Il colore del bottone segue esplicitamente lo stato della lista, non hover/focus
                bottone.classList.toggle('carrello-flottante-attivo', !listaElementi.classList.contains('d-none'));
            }
            return;
        }

        var azione = event.target.closest('.btn-aumenta-elemento, .btn-diminuisci-elemento, .btn-rimuovi-elemento, .btn-svuota-preventivo');
        if (!azione) {
            return;
        }
        if (azione.dataset.azioneInCorso === 'true') {
            return;
        }
        azione.dataset.azioneInCorso = 'true';
        eseguiAzione(azione.dataset.url);
    });

    // Campo quantita' scrivibile da tastiera: "change" sottomette al valore commesso, Invio forza un blur
    container.addEventListener('change', function (event) {
        var campo = event.target;
        if (!campo.matches || !campo.matches('.campo-quantita-elemento')) {
            return;
        }
        if (campo.dataset.azioneInCorso === 'true') {
            return;
        }
        campo.dataset.azioneInCorso = 'true';
        eseguiAzione(campo.dataset.url, { quantita: campo.value });
    });

    container.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && event.target.matches && event.target.matches('.campo-quantita-elemento')) {
            event.preventDefault();
            event.target.blur();
        }
    });

    // Seleziona il valore attuale al focus
    container.addEventListener('focus', function (event) {
        var campo = event.target;
        if (campo.matches && campo.matches('.campo-quantita-elemento')) {
            campo.select();
        }
    }, true);
})();
