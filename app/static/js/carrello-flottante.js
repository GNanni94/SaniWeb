// Widget del carrello fluttuante: bottone (sempre visibile tranne sulla
// pagina carrello, dove il widget non viene mai renderizzato - vedi
// base.html) che si espande in un pannello con la lista dei prodotti nel
// carrello. Ogni azione (aumenta/diminuisci/rimuovi dal pannello, o
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
        var htmlTrim = html.trim();
        var pannelloEsistente = document.getElementById('pannelloCarrelloFlottante');

        // Aggiornamento in-place: il widget c'era gia' prima di questa azione
        // e continua ad esserci dopo (risposta non vuota) - si sostituisce
        // solo il contenuto del pannello, lasciando intatti i nodi DOM del
        // bottone e del bordo del pannello (".carrello-flottante-attivo"/
        // ".su-footer" restano quindi automaticamente quelli che erano,
        // nessuna classe da riapplicare a mano). Un innerHTML completo li
        // ricreerebbe ad ogni singolo +/-/quantita', causando un ripaint
        // visibile del bordo (vedi carrello-flottante.css) ad ogni azione
        if (htmlTrim && pannelloEsistente) {
            var tmp = document.createElement('div');
            tmp.innerHTML = htmlTrim;
            var nuovoPannello = tmp.querySelector('#pannelloCarrelloFlottante');
            if (nuovoPannello) {
                pannelloEsistente.innerHTML = nuovoPannello.innerHTML;
            }
            aggiornaBordoSuFooter();
            return;
        }

        // Altrimenti non c'e' niente da preservare: primo prodotto aggiunto
        // (il widget non esisteva ancora) o carrello appena svuotato
        // (risposta vuota, il partial non produce output) - si ricostruisce
        // tutto da zero, stesso comportamento di prima
        var eraAperto = mantieniAperto || pannelloAperto();
        container.innerHTML = htmlTrim;
        if (eraAperto) {
            var pannello = document.getElementById('pannelloCarrelloFlottante');
            if (pannello) {
                pannello.classList.remove('d-none');
            }
            // Il bottone appena inserito e' HTML nuovo dal server: non porta
            // con se' la classe che ne segnava lo stato "aperto" (aggiunta
            // via JS, non dal template) - va riapplicata qui, altrimenti
            // tornerebbe al colore di default pur restando il pannello aperto
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
        if (!campo.matches || !campo.matches('.campo-quantita-flottante')) {
            return;
        }
        if (campo.dataset.azioneInCorso === 'true') {
            return;
        }
        campo.dataset.azioneInCorso = 'true';
        eseguiAzione(campo.dataset.url, { quantita: campo.value });
    });

    container.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && event.target.matches && event.target.matches('.campo-quantita-flottante')) {
            event.preventDefault();
            event.target.blur();
        }
    });

    // Seleziona il valore attuale al focus, stesso motivo di carrello-ajax.js
    container.addEventListener('focus', function (event) {
        var campo = event.target;
        if (campo.matches && campo.matches('.campo-quantita-flottante')) {
            campo.select();
        }
    }, true);
})();
