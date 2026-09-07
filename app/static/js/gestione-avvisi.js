// Gestione avvisi di chiusura: apre il pop-up "+Nuovo avviso", smista la
// risposta del salvataggio in base all'esito (successo -> tabella, errori
// di validazione -> modal), apre il modal di "Modifica" solo a form
// caricato, inizializza Flatpickr sui campi data. Il resto (apertura di
// "Modifica" con i dati precompilati, salvataggio, eliminazione, toggle)
// e' gestito via htmx.
(function () {
    var tabellaContainer = document.getElementById('tabella-avvisi');
    var modalEl = document.getElementById('modalAvviso');
    var modalBody = document.getElementById('modalAvvisoBody');
    var btnNuovo = document.getElementById('btnNuovoAvviso');
    if (!tabellaContainer || !modalEl || !modalBody) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    // Snapshot del form vuoto (form_avviso.html non compilato), usato da
    // "+ Nuovo avviso" per ripartire sempre da uno stato pulito, attributi
    // hx-* inclusi
    var formInizialeHTML = modalBody.innerHTML;

    // Sostituisce i due campi data nativi con un calendario Flatpickr
    // inline (rangePlugin) per scegliere "Data inizio" e "Data fine" con
    // due click, con l'intervallo evidenziato. Se flatpickr non si
    // inizializza restano visibili i due <input type="date"> nativi di
    // "campi-date-avviso". Va richiamata ogni volta che il form nel modal
    // viene ricreato da zero (reset di "+Nuovo avviso", caricamento di
    // "Modifica", ri-visualizzazione dopo un errore di validazione).
    // Interpreta una stringa ISO "AAAA-MM-GG" come Date locale (mezzanotte
    // nel fuso orario del browser)
    function analizzaDataIso(valoreIso) {
        var parti = valoreIso ? valoreIso.split('-') : [];
        if (parti.length !== 3) {
            return null;
        }
        return new Date(Number(parti[0]), Number(parti[1]) - 1, Number(parti[2]));
    }

    function formattaDataItaliana(data) {
        var giorno = String(data.getDate()).padStart(2, '0');
        var mese = String(data.getMonth() + 1).padStart(2, '0');
        return giorno + '/' + mese + '/' + data.getFullYear();
    }

    function formattaDataIso(data) {
        var mese = String(data.getMonth() + 1).padStart(2, '0');
        var giorno = String(data.getDate()).padStart(2, '0');
        return data.getFullYear() + '-' + mese + '-' + giorno;
    }

    function stessoGiorno(a, b) {
        return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    // Aggiorna i valori testuali "Data inizio"/"Data fine" mostrati accanto
    // al calendario
    function aggiornaTestoPeriodo(elementoInizio, elementoFine, dataInizio, dataFine) {
        if (elementoInizio) {
            elementoInizio.textContent = dataInizio ? formattaDataItaliana(dataInizio) : '—';
        }
        if (elementoFine) {
            elementoFine.textContent = dataFine ? formattaDataItaliana(dataFine) : '—';
        }
    }

    // Sostituisce il <select> nativo del mese generato da flatpickr con un
    // bottone e un pannello a pillole in stile navbar. Il <select> resta
    // nascosto nel DOM: e' ancora lui a sapere quali mesi sono disponibili
    // nell'anno corrente (flatpickr toglie da li' i mesi gia' passati), le
    // pillole vengono costruite leggendolo
    function inizializzaSelettoreMese(istanza) {
        var selectNativo = istanza.monthsDropdownContainer;
        if (!selectNativo) {
            return;
        }
        selectNativo.hidden = true;
        var contenitoreMese = selectNativo.parentElement;
        var bottone = contenitoreMese.querySelector('.selettore-mese-avviso') || document.createElement('button');
        bottone.type = 'button';
        bottone.className = 'selettore-mese-avviso';
        if (!bottone.parentElement) {
            contenitoreMese.insertBefore(bottone, selectNativo);
        }
        // Il pannello viene agganciato a ".flatpickr-calendar" (non a
        // "contenitoreMese") e posizionato "a mano" sotto al bottone ad
        // ogni apertura
        var contenitoreCalendarioMese = istanza.calendarContainer;
        var pannello = contenitoreCalendarioMese.querySelector('.selettore-mese-avviso-pannello') || document.createElement('div');
        pannello.className = 'selettore-mese-avviso-pannello';
        pannello.hidden = true;
        if (!pannello.parentElement) {
            contenitoreCalendarioMese.appendChild(pannello);
        }

        function posizionaPannello() {
            var rettangoloBottone = bottone.getBoundingClientRect();
            var rettangoloCalendario = contenitoreCalendarioMese.getBoundingClientRect();
            pannello.style.top = (rettangoloBottone.bottom - rettangoloCalendario.top) + 'px';
            pannello.style.left = (rettangoloBottone.left + rettangoloBottone.width / 2 - rettangoloCalendario.left) + 'px';
        }

        // Legge il mese corrente da "istanza.currentMonth" (indice
        // assoluto 0-11, corrisponde al "value" di ciascuna <option>)
        // invece che da "selectNativo.selectedIndex"
        function aggiornaTestoBottone() {
            var opzioneScelta = selectNativo.querySelector('option[value="' + istanza.currentMonth + '"]');
            bottone.textContent = opzioneScelta ? opzioneScelta.textContent : '';
        }

        function ricostruisciPannello() {
            pannello.innerHTML = '';
            Array.prototype.forEach.call(selectNativo.options, function (opzione, indice) {
                var voce = document.createElement('button');
                voce.type = 'button';
                voce.className = 'opzione-mese-avviso';
                voce.textContent = opzione.textContent;
                if (indice === selectNativo.selectedIndex) {
                    var pallino = document.createElement('span');
                    pallino.className = 'pallino-mese-corrente';
                    voce.appendChild(pallino);
                }
                voce.addEventListener('click', function () {
                    // "changeMonth" lancia da solo "onMonthChange", che
                    // aggiorna gia' il testo del bottone
                    istanza.changeMonth(Number(opzione.value), false);
                    pannello.hidden = true;
                });
                pannello.appendChild(voce);
            });
        }

        bottone.addEventListener('click', function (event) {
            event.stopPropagation();
            var eraAperto = !pannello.hidden;
            chiudiTuttiIPannelliMese();
            if (!eraAperto) {
                ricostruisciPannello();
                posizionaPannello();
                pannello.hidden = false;
            }
        });
        aggiornaTestoBottone();
        return aggiornaTestoBottone;
    }

    // Chiude il pannello del selettore mese aperto quando si clicca fuori
    function chiudiTuttiIPannelliMese() {
        document.querySelectorAll('.selettore-mese-avviso-pannello').forEach(function (elemento) {
            elemento.hidden = true;
        });
    }
    document.addEventListener('click', chiudiTuttiIPannelliMese);

    function inizializzaCalendarioDate(container) {
        var inputInizio = container.querySelector('#id_data_inizio');
        var inputFine = container.querySelector('#id_data_fine');
        var campiData = container.querySelector('#campi-date-avviso');
        var blocco = container.querySelector('#blocco-calendario-avviso');
        var contenitoreCalendario = container.querySelector('#calendario-periodo-avviso');
        var elementoDataInizio = container.querySelector('#valore-data-inizio-avviso');
        var elementoDataFine = container.querySelector('#valore-data-fine-avviso');
        if (!inputInizio || !inputFine || !blocco || !contenitoreCalendario || typeof flatpickr === 'undefined') {
            return;
        }
        // I due <input> restano visibili (type=text): flatpickr scrive li'
        // il valore ad ogni click, ed e' quello mandato al server nel
        // submit del form
        inputInizio.setAttribute('type', 'text');
        inputFine.setAttribute('type', 'text');
        if (campiData) {
            campiData.hidden = true;
        }
        blocco.hidden = false;
        // Stato iniziale letto direttamente dai due <input>, valido sia
        // per un form vuoto ("+Nuovo avviso") sia gia' precompilato
        // ("Modifica")
        var stato = {
            inizio: analizzaDataIso(inputInizio.value),
            fine: analizzaDataIso(inputFine.value)
        };
        aggiornaTestoPeriodo(elementoDataInizio, elementoDataFine, stato.inizio, stato.fine);
        // Aggiunge la classe "intervallo-completo" al calendario solo
        // quando "stato" riflette una scelta confermata, non la sola
        // anteprima che flatpickr mostra passando il mouse sopra le date
        function sincronizzaClasseIntervallo(istanza) {
            istanza.calendarContainer.classList.toggle('intervallo-completo', !!(stato.inizio && stato.fine));
        }
        // Scrive a mano il valore di "data_fine" dopo ogni "setDate([...],
        // false)": con "triggerChange" a "false" flatpickr non aggiorna da
        // solo quell'<input> tramite "rangePlugin"
        function sincronizzaInputDate() {
            inputInizio.value = stato.inizio ? formattaDataIso(stato.inizio) : '';
            inputFine.value = stato.fine ? formattaDataIso(stato.fine) : '';
        }
        // Assegnata solo dopo la creazione dell'istanza flatpickr (serve
        // l'istanza stessa per costruire il selettore mese)
        var aggiornaBottoneMese = null;
        var istanzaFlatpickr = flatpickr(inputInizio, {
            plugins: [new rangePlugin({ input: inputFine })],
            dateFormat: 'Y-m-d',
            locale: 'it',
            inline: true,
            appendTo: contenitoreCalendario,
            // I giorni prima di oggi restano visibili ma non selezionabili
            minDate: 'today',
            // Aggiorna il testo del bottone-mese quando il mese cambia da
            // un'altra fonte del pannello personalizzato (frecce prev/next,
            // cambio anno)
            onMonthChange: function () {
                if (aggiornaBottoneMese) {
                    aggiornaBottoneMese();
                }
            },
            onYearChange: function () {
                if (aggiornaBottoneMese) {
                    aggiornaBottoneMese();
                }
            },
            // Se l'intervallo e' gia' completo, un click sulla data di
            // inizio azzera la selezione; un click su una data diversa
            // sostituisce la fine (scambiando inizio/fine se la nuova data
            // cade prima dell'attuale inizio). "dateSelezionate[0]" e'
            // sempre la data realmente cliccata: la seconda posizione va
            // ignorata e ricalcolata da "stato"
            onChange: function (dateSelezionate, dataStr, istanza) {
                if (dateSelezionate.length === 2 && stato.inizio && stato.fine) {
                    var dataCliccata = dateSelezionate[0];
                    if (stessoGiorno(dataCliccata, stato.inizio)) {
                        stato.inizio = null;
                        stato.fine = null;
                        istanza.clear();
                    } else {
                        var nuovoInizio = stato.inizio;
                        var nuovaFine = dataCliccata;
                        if (dataCliccata < stato.inizio) {
                            nuovoInizio = dataCliccata;
                            nuovaFine = stato.inizio;
                        }
                        stato.inizio = nuovoInizio;
                        stato.fine = nuovaFine;
                        istanza.setDate([stato.inizio, stato.fine], false);
                    }
                } else if (dateSelezionate.length === 2) {
                    // Primo/secondo click senza un intervallo precedente
                    // completo
                    stato.inizio = dateSelezionate[0];
                    stato.fine = dateSelezionate[1];
                } else if (dateSelezionate.length === 1) {
                    stato.inizio = dateSelezionate[0];
                    stato.fine = null;
                } else {
                    stato.inizio = null;
                    stato.fine = null;
                }
                sincronizzaInputDate();
                aggiornaTestoPeriodo(elementoDataInizio, elementoDataFine, stato.inizio, stato.fine);
                sincronizzaClasseIntervallo(istanza);
            }
        });
        // Imposta la classe dell'intervallo gia' allo stato iniziale (es.
        // "Modifica" apre il calendario gia' con inizio/fine precompilati)
        sincronizzaClasseIntervallo(istanzaFlatpickr);
        aggiornaBottoneMese = inizializzaSelettoreMese(istanzaFlatpickr);

        // Se si passa al campo motivo chiusura con solo la data di inizio
        // scelta, imposta la fine uguale all'inizio (chiusura di un solo
        // giorno). Se la fine e' gia' impostata non si tocca nulla
        var motivoInput = container.querySelector('#id_motivo_chiusura');
        if (motivoInput) {
            motivoInput.addEventListener('focus', function () {
                if (stato.inizio && !stato.fine) {
                    stato.fine = stato.inizio;
                    istanzaFlatpickr.setDate([stato.inizio, stato.fine], false);
                    sincronizzaInputDate();
                    aggiornaTestoPeriodo(elementoDataInizio, elementoDataFine, stato.inizio, stato.fine);
                    sincronizzaClasseIntervallo(istanzaFlatpickr);
                }
            });
        }
    }
    inizializzaCalendarioDate(modalBody);

    if (btnNuovo) {
        // L'apertura del modal per "+Nuovo avviso" e' dichiarativa
        // (data-bs-toggle/data-bs-target su questo bottone), gestita da
        // Bootstrap
        btnNuovo.addEventListener('click', function () {
            modalBody.innerHTML = formInizialeHTML;
            // "htmx.process" registra gli attributi hx-* del nuovo form
            // appena inserito con "innerHTML ="
            htmx.process(modalBody);
            inizializzaCalendarioDate(modalBody);
        });
    }

    // "Modifica" carica nel modal il form gia' precompilato dal server via
    // "hx-get": il modal viene aperto solo dopo che il contenuto e'
    // arrivato, e flatpickr viene reinizializzato sui nuovi <input>. Lo
    // stesso evento copre anche il form ri-mostrato nel modal dopo un
    // errore di validazione
    document.addEventListener('htmx:afterSwap', function (event) {
        if (event.detail.target !== modalBody) {
            return;
        }
        inizializzaCalendarioDate(modalBody);
        if (event.detail.requestConfig && event.detail.requestConfig.verb === 'get') {
            modalBootstrap.show();
        }
    });

    // Il toggle "attivo" e il bottone "Elimina" sono gestiti interamente
    // da htmx (hx-post/hx-target/hx-swap="morph:outerHTML" sull'elemento
    // stesso, "hx-confirm" per l'elimina), nessun listener JS per loro.

    // Ricarica la pagina se il caricamento di "Modifica" (richiesta GET)
    // fallisce; gli errori di toggle/elimina (richieste POST) restano sul
    // comportamento di default di htmx
    tabellaContainer.addEventListener('htmx:responseError', function (event) {
        if (event.detail.requestConfig && event.detail.requestConfig.verb === 'get') {
            window.location.reload();
        }
    });

    // Forza lo swap sul modal per gli errori di validazione (400): htmx
    // non applica lo swap di default fuori dal range 2xx, e
    // "htmx:beforeSwap" scatta sul bersaglio originale del form
    // ("#tabella-avvisi") anche quando l'header "HX-Retarget" lo cambia,
    // quindi il listener resta su "document" (antenato di entrambi)
    document.addEventListener('htmx:beforeSwap', function (event) {
        if (event.detail.target === modalBody) {
            event.detail.shouldSwap = true;
        }
    });

    // Chiude il modal solo dopo un salvataggio riuscito (2xx)
    modalBody.addEventListener('htmx:afterRequest', function (event) {
        var status = event.detail.xhr.status;
        if (status >= 200 && status < 300) {
            modalBootstrap.hide();
        }
    });

    // Ricarica la pagina per un errore di salvataggio diverso da 400
    // (errori di validazione, gestiti sopra)
    modalBody.addEventListener('htmx:responseError', function (event) {
        if (event.detail.xhr.status !== 400) {
            window.location.reload();
        }
    });

    // Ricarica la pagina se la richiesta di salvataggio non arriva a
    // destinazione (rete assente, server giu')
    modalBody.addEventListener('htmx:sendError', function () {
        window.location.reload();
    });
})();
