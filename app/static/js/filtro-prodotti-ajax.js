// Aggiorna la griglia prodotti (filtro sottocategoria, ricerca, paginazione)
// via AJAX invece di un reload completo della pagina
(function () {
    var container = document.getElementById('listaProdottiContainer');
    var filtroWrapper = document.getElementById('filtroProdottiWrapper');
    var listaFiltro = filtroWrapper ? filtroWrapper.querySelector('.filtro-dropdown-menu') : null;
    var formRicerca = document.getElementById('ricercaProdottiForm');
    var inputRicerca = document.getElementById('prodottiCardSearch');
    var wrapperRicerca = document.getElementById('ricercaProdottiWrapper');
    var toggleRicerca = document.getElementById('search-addon');
    var toastRicercaSenzaRisultati = document.getElementById('toastRicercaSenzaRisultati');
    var toastRicercaSenzaRisultatiTesto = document.getElementById('toastRicercaSenzaRisultatiTesto');
    if (!container) {
        return;
    }

    // Mostra il toast di ricerca senza risultati; esegue "dopoComparsa"
    // solo dopo che il toast e' comparso del tutto (evento "shown.bs.toast")
    function mostraToastRicercaSenzaRisultati(messaggio, dopoComparsa) {
        if (!toastRicercaSenzaRisultati || !toastRicercaSenzaRisultatiTesto) {
            if (dopoComparsa) {
                dopoComparsa();
            }
            return;
        }
        toastRicercaSenzaRisultatiTesto.textContent = messaggio;
        var toast = bootstrap.Toast.getOrCreateInstance(toastRicercaSenzaRisultati);
        if (dopoComparsa) {
            toastRicercaSenzaRisultati.addEventListener('shown.bs.toast', dopoComparsa, { once: true });
        }
        toast.show();
    }

    // Token di sequenza: una richiesta piu' recente sovrascrive quella
    // precedente ancora in corso, anche se le risposte arrivano fuori ordine
    var richiestaCorrente = 0;

    // Velocita' costante di scroll verso la cima, in px/ms
    var VELOCITA_SCROLL_PX_MS = 3;

    // Scorre in cima alla pagina animando con requestAnimationFrame
    function scrollDolceInCima() {
        var partenza = window.pageYOffset || document.documentElement.scrollTop;
        if (partenza === 0) {
            return;
        }
        var durataMs = partenza / VELOCITA_SCROLL_PX_MS;
        var inizio = null;
        function step(timestamp) {
            if (!inizio) {
                inizio = timestamp;
            }
            var progresso = Math.min((timestamp - inizio) / durataMs, 1);
            window.scrollTo({ top: partenza * (1 - progresso), left: 0, behavior: 'auto' });
            if (progresso < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    // Applica il nuovo contenuto alla griglia (Idiomorph, fallback a innerHTML)
    // e sincronizza campo nascosto sottocategoria e titolo/tab del browser
    function applicaContenuto(nuovoContenuto) {
        if (window.Idiomorph) {
            Idiomorph.morph(container, nuovoContenuto.innerHTML, { morphStyle: 'innerHTML' });
        } else {
            container.innerHTML = nuovoContenuto.innerHTML;
        }
        var hiddenSottocategoria = document.getElementById('ricercaSottocategoriaHidden');
        if (hiddenSottocategoria) {
            hiddenSottocategoria.value = nuovoContenuto.dataset.sottocategoria || '';
        }
        var titoloLink = document.getElementById('titoloCategoriaLink');
        if (titoloLink) {
            titoloLink.textContent = nuovoContenuto.dataset.nomeCategoria;
        }
        document.title = nuovoContenuto.dataset.nomeCategoria;
    }

    function caricaConAjax(url, scrollInCima) {
        var idRichiesta = ++richiestaCorrente;
        // Se la ricerca risulta senza esito, la classe di caricamento viene
        // tolta dal callback del toast (vedi sotto) invece che nel finally
        var rimuoviCaricamentoSubito = true;
        container.classList.add('lista-prodotti-in-caricamento');
        fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Errore nel caricamento dei prodotti');
                }
                return response.text();
            })
            .then(function (html) {
                if (idRichiesta !== richiestaCorrente) {
                    // Risposta superata da una richiesta piu' recente
                    return;
                }
                // Estrae il contenuto interno del div ricevuto (evita il
                // doppio-wrapping dell'id "listaProdottiContainer")
                var tmp = document.createElement('div');
                tmp.innerHTML = html.trim();
                var nuovoContenuto = tmp.firstElementChild;
                if (!nuovoContenuto || nuovoContenuto.id !== 'listaProdottiContainer') {
                    // Fallback alla navigazione normale se la risposta non e' il partial atteso
                    window.location.href = url;
                    return;
                }
                var urlDaMostrare = url;
                if (nuovoContenuto.dataset.ricercaSenzaRisultati === '1') {
                    rimuoviCaricamentoSubito = false;
                    // Mostra prima il toast e solo a comparsa avvenuta aggiorna
                    // la griglia, cosi' il cambio di contenuto non anticipa l'avviso
                    mostraToastRicercaSenzaRisultati(nuovoContenuto.dataset.messaggioRicercaSenzaRisultati, function () {
                        applicaContenuto(nuovoContenuto);
                        container.classList.remove('lista-prodotti-in-caricamento');
                        if (inputRicerca) {
                            inputRicerca.value = '';
                        }
                        impostaFiltroDefault();
                        aggiornaClasseFiltroAttivo();
                        if (wrapperRicerca && wrapperRicerca.classList.contains('ricerca-espansa')) {
                            wrapperRicerca.classList.remove('ricerca-espansa');
                            if (toggleRicerca) {
                                toggleRicerca.setAttribute('aria-expanded', 'false');
                            }
                        }
                    });
                    // Mostra nell'URL la categoria intera invece della ricerca fallita
                    var titoloLink = document.getElementById('titoloCategoriaLink');
                    if (titoloLink) {
                        urlDaMostrare = titoloLink.href;
                    }
                } else {
                    applicaContenuto(nuovoContenuto);
                }
                // Aggiorna l'URL senza aggiungere una voce alla cronologia
                history.replaceState(null, '', urlDaMostrare);
                // Scrolla in cima solo per la paginazione
                if (scrollInCima) {
                    scrollDolceInCima();
                }
            })
            .catch(function () {
                // Fallback: reload completo della pagina
                if (idRichiesta === richiestaCorrente) {
                    window.location.href = url;
                }
            })
            .finally(function () {
                if (idRichiesta === richiestaCorrente && rimuoviCaricamentoSubito) {
                    container.classList.remove('lista-prodotti-in-caricamento');
                }
            });
    }

    // Alterna l'icona del filtro tra piena (sottocategoria selezionata) e a contorno (nessun filtro attivo)
    function aggiornaClasseFiltroAttivo() {
        if (!filtroWrapper || !listaFiltro) {
            return;
        }
        var iconaFiltro = filtroWrapper.querySelector('.filtro-icon-overlay');
        var primaVoce = listaFiltro.querySelector('.filtro-dropdown-item');
        if (!iconaFiltro || !primaVoce) {
            return;
        }
        var attivo = !primaVoce.classList.contains('active');
        iconaFiltro.classList.toggle('bi-funnel-fill', attivo);
        iconaFiltro.classList.toggle('bi-funnel', !attivo);
    }

    // Sposta la classe "active" sulla sola voce di filtro scelta
    function impostaVoceFiltroAttiva(voceScelta) {
        if (!listaFiltro) {
            return;
        }
        var voci = listaFiltro.querySelectorAll('.filtro-dropdown-item');
        for (var i = 0; i < voci.length; i++) {
            voci[i].classList.toggle('active', voci[i] === voceScelta);
        }
    }

    // Riporta il filtro sulla prima voce del menu ("MOSTRA TUTTO"), senza navigare
    function impostaFiltroDefault() {
        if (!listaFiltro) {
            return;
        }
        var primaVoce = listaFiltro.querySelector('.filtro-dropdown-item');
        if (primaVoce) {
            impostaVoceFiltroAttiva(primaVoce);
        }
    }

    aggiornaClasseFiltroAttivo();

    // Delegazione sul menu filtro
    if (listaFiltro) {
        listaFiltro.addEventListener('click', function (event) {
            var voce = event.target.closest('.filtro-dropdown-item');
            if (!voce) {
                return;
            }
            event.preventDefault();
            impostaVoceFiltroAttiva(voce);
            aggiornaClasseFiltroAttivo();
            var url = voce.dataset.url;
            if (url) {
                caricaConAjax(url, false);
            }
        });
    }

    if (formRicerca) {
        // Intercetta l'invio del form di ricerca (tastiera o bottone-lente su mobile)
        formRicerca.addEventListener('submit', function (event) {
            event.preventDefault();
            var parametri = new URLSearchParams(new FormData(formRicerca));
            caricaConAjax(formRicerca.action + '?' + parametri.toString(), false);
        });
    }

    // Link del titolo: torna alla lista completa della categoria, senza sottocategoria/ricerca
    var titoloLink = document.getElementById('titoloCategoriaLink');
    if (titoloLink) {
        titoloLink.addEventListener('click', function (event) {
            event.preventDefault();
            impostaFiltroDefault();
            aggiornaClasseFiltroAttivo();
            caricaConAjax(titoloLink.href, false);
        });
    }

    // Delegazione sul container: intercetta anche i link di paginazione rigenerati dopo lo swap
    container.addEventListener('click', function (event) {
        var link = event.target.closest('a.page-link');
        if (!link) {
            return;
        }
        event.preventDefault();
        caricaConAjax(link.href, true);
    });
})();
