// Widget del carrello fluttuante: bottone (sempre visibile tranne sulla
// pagina carrello, dove il widget non viene mai renderizzato - vedi
// base.html) che si espande in una lista dei prodotti nel
// carrello. Ogni azione (aumenta/diminuisci/rimuovi dalla lista, o
// un'aggiunta fatta altrove nel sito via aggiungi-al-carrello.js)
// aggiorna il contenuto con l'HTML gia' pronto restituito dal server
// (stesso pattern di gestione-avvisi.js), cosi' la lista resta sempre
// coerente con lo stato reale - incluso il caso "primo prodotto aggiunto"
// (il widget compare per la prima volta) e "ultimo prodotto rimosso" (il
// widget sparisce, il partial non produce output).
(function () {
    var container = document.getElementById('carrelloFlottanteContainer');
    if (!container) {
        return;
    }

    // Bottone "indietro" del browser dopo una modifica al carrello fatta
    // nella pagina carrello (che non renderizza mai questo widget, vedi
    // sopra): molti browser ripristinano la pagina precedente dalla bfcache
    // (il DOM congelato di quando l'ha lasciata) invece di richiederla di
    // nuovo al server, quindi badge/quantita' qui dentro resterebbero quelli
    // di prima della modifica finche' non si ricarica a mano.
    // "pageshow"/"event.persisted" e' il segnale che la pagina viene
    // proprio da li' (non da un caricamento normale, dove "persisted" e'
    // false): un reload completo la riallinea, stesso approccio gia' usato
    // altrove nel progetto come fallback quando serve dato fresco dal
    // server invece di rincorrerlo via JS (es. errori di fetch qui sotto)
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            window.location.reload();
        }
    });

    function listaElementiAperta() {
        var listaElementi = document.getElementById('listaElementiCarrelloFlottante');
        return !!listaElementi && !listaElementi.classList.contains('d-none');
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
        var htmlTrim = html.trim();
        var listaElementiEsistente = document.getElementById('listaElementiCarrelloFlottante');

        // Aggiornamento in-place: il widget c'era gia' prima di questa azione
        // e continua ad esserci dopo (risposta non vuota) - si sostituisce
        // solo il contenuto della lista, lasciando intatti i nodi DOM del
        // bottone e del bordo della lista (".carrello-flottante-attivo"/
        // ".su-footer" restano quindi automaticamente quelli che erano,
        // nessuna classe da riapplicare a mano). Un innerHTML completo del
        // contenitore esterno ricreerebbe anche il bottone ad ogni singolo
        // +/-/quantita' (NON causa un ripaint visibile del bordo - verificato
        // con test: la riapplicazione delle classi e' sincrona, il browser non
        // disegna mai lo stato intermedio senza classi - ma sprecherebbe
        // comunque lavoro DOM ricreando anche il bottone senza motivo)
        if (htmlTrim && listaElementiEsistente) {
            var tmp = document.createElement('div');
            tmp.innerHTML = htmlTrim;
            var nuovaListaElementi = tmp.querySelector('#listaElementiCarrelloFlottante');
            if (nuovaListaElementi) {
                // Idiomorph (caricata in base.html) preserva i nodi DOM
                // invariati - es. gli <li> di prodotti la cui quantita' non
                // e' cambiata - invece di ricrearli tutti come farebbe un
                // innerHTML completo: preserva anche il focus/l'interazione
                // in corso su un campo di un ALTRO prodotto della lista
                // durante l'aggiornamento. Verificato con test (Playwright):
                // vedi Docs/AJAX/carrello_flottante.md. Fallback al vecchio
                // comportamento se la libreria non risultasse caricata (es.
                // CDN irraggiungibile)
                if (window.Idiomorph) {
                    Idiomorph.morph(listaElementiEsistente, nuovaListaElementi.innerHTML, { morphStyle: 'innerHTML' });
                } else {
                    listaElementiEsistente.innerHTML = nuovaListaElementi.innerHTML;
                }
            }
            // Niente aggiornaBordoSuFooter() qui: il bottone e' "position: fixed"
            // con offset fissi (carrello-flottante.css) e la lista e' "position:
            // absolute" (fuori dal flusso) - il numero di prodotti nella lista non
            // puo' mai spostare il bottone, quindi il risultato sarebbe sempre
            // identico a quello di prima di questo aggiornamento
            return;
        }

        // Altrimenti non c'e' niente da preservare: primo prodotto aggiunto
        // (il widget non esisteva ancora) o carrello appena svuotato
        // (risposta vuota, il partial non produce output) - si ricostruisce
        // tutto da zero, stesso comportamento di prima
        var eraAperto = mantieniAperto || listaElementiAperta();
        container.innerHTML = htmlTrim;
        if (eraAperto) {
            var listaElementi = document.getElementById('listaElementiCarrelloFlottante');
            if (listaElementi) {
                listaElementi.classList.remove('d-none');
            }
            // Il bottone appena inserito e' HTML nuovo dal server: non porta
            // con se' la classe che ne segnava lo stato "aperto" (aggiunta
            // via JS, non dal template) - va riapplicata qui, altrimenti
            // tornerebbe al colore di default pur restando la lista aperta
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

    // Fetch condivisa da bottoni +/-/rimuovi/svuota e dal campo quantita'
    // qui sotto: stesso corpo (token CSRF + eventuali campi extra, es.
    // "quantita"), stessa gestione di risposta/errore per tutti
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
        // "Checkout preventivo": chiude la lista prima di lasciar
        // proseguire la normale navigazione del link (niente
        // preventDefault) verso la pagina carrello, invece di lasciarla
        // aperta mentre la pagina cambia. Senza, tornando indietro da
        // carrello.html (che non renderizza mai questo widget) si vedrebbe
        // la lista ancora aperta per un istante prima che il reload di
        // "pageshow" qui sopra la richiuda - una chiusura visibilmente
        // brusca invece che gia' chiusa in partenza
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
                // Colore del bottone legato esplicitamente allo stato della
                // lista (aperta/chiusa), non lasciato a hover/focus del
                // browser - altrimenti un secondo click per chiudere (che è
                // comunque un click, quindi anch'esso mette a fuoco il
                // bottone) potrebbe non far tornare il colore a quello di
                // default in modo affidabile
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

    // Campo quantita' scrivibile da tastiera (stesso principio di
    // carrello-ajax.js nella pagina carrello): "change" per sottomettere
    // solo a valore commesso. Qui non c'e' un <form> a sottomettere da solo
    // con Invio (i bottoni +/- non ne usano uno, vedi sopra), quindi Invio
    // e' gestito a mano piu' sotto forzando un blur, che fa scattare
    // "change" - un solo percorso di invio, nessuna duplicazione
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

    // Seleziona il valore attuale al focus, stesso motivo di carrello-ajax.js
    container.addEventListener('focus', function (event) {
        var campo = event.target;
        if (campo.matches && campo.matches('.campo-quantita-elemento')) {
            campo.select();
        }
    }, true);
})();
