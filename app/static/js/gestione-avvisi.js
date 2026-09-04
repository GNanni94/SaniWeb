// Gestione avvisi di chiusura: apertura del pop-up "+Nuovo avviso" via JS
// (riparte da uno snapshot vuoto del form), tutto il resto - apertura di
// "Modifica" con i dati precompilati, salvataggio, eliminazione, toggle -
// via htmx (vedi base.html per l'header CSRF condiviso e
// Docs/AJAX/carrello_flottante.md per lo swap "morph"). Resta in JS solo
// cio' che non si riduce a semplici attributi: smistare la risposta del
// salvataggio verso un bersaglio diverso a seconda dell'esito (successo ->
// tabella, errori di validazione -> modal), aprire il modal solo dopo che
// "Modifica" ha finito di caricare il form precompilato, e inizializzare
// Flatpickr sui campi data (vedi gestione_avvisi.html per gli script/CSS
// caricati e calendario-avvisi.css per il tema colori del sito).
(function () {
    var tabellaContainer = document.getElementById('tabella-avvisi');
    var modalEl = document.getElementById('modalAvviso');
    var modalBody = document.getElementById('modalAvvisoBody');
    var btnNuovo = document.getElementById('btnNuovoAvviso');
    if (!tabellaContainer || !modalEl || !modalBody) {
        return;
    }
    var modalBootstrap = new bootstrap.Modal(modalEl);
    // Snapshot del form vuoto (form_avviso.html non compilato) cosi'
    // "+ Nuovo avviso" puo' sempre ripartire da uno stato pulito, invece
    // di affidarsi a f.reset() - che dopo un errore di validazione
    // ripristinerebbe i valori (invalidi) appena sottomessi, non un form
    // vuoto, perche' il form ri-renderizzato dal server e' "bound". Include
    // gia' gli attributi hx-* (catturati dal rendering iniziale del server)
    var formInizialeHTML = modalBody.innerHTML;

    // Sostituisce i due campi data nativi con un calendario Flatpickr
    // incorporato nella pagina (colori/font del sito, vedi
    // calendario-avvisi.css) - non un popup che si apre al click, ma sempre
    // visibile ("inline"), cosi' "Data inizio" e "Data fine" si scelgono
    // insieme con due click sulla stessa vista, con l'intervallo
    // evidenziato ("rangePlugin", caricato in gestione_avvisi.html insieme
    // al resto di flatpickr). Se flatpickr non si inizializza (rete
    // assente, CDN giu'), restano visibili i due <input type="date">
    // nativi di "campi-date-avviso" - degradazione elegante, non un form
    // rotto. Va richiamata ogni volta che il form nel modal viene ricreato
    // da zero (reset di "+Nuovo avviso", caricamento di "Modifica",
    // ri-visualizzazione dopo un errore di validazione) perche' gli
    // <input> di prima non esistono piu' nel DOM - un'istanza flatpickr sui
    // vecchi nodi non servirebbe a nulla
    // "2026-09-24" -> Date locale (mezzanotte in fuso orario del browser,
    // non UTC: "new Date('2026-09-24')" interpreterebbe la stringa come UTC
    // e su fusi orari indietro rispetto a UTC mostrerebbe il giorno prima)
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

    // Valori "Data inizio"/"Data fine" accanto al calendario (vedi
    // form_avviso.html), aggiornati ad ogni scelta sul calendario
    function aggiornaTestoPeriodo(elementoInizio, elementoFine, dataInizio, dataFine) {
        if (elementoInizio) {
            elementoInizio.textContent = dataInizio ? formattaDataItaliana(dataInizio) : '—';
        }
        if (elementoFine) {
            elementoFine.textContent = dataFine ? formattaDataItaliana(dataFine) : '—';
        }
    }

    // Sostituisce il <select> nativo del mese nell'intestazione del
    // calendario (quello che flatpickr genera da solo, "Settembre" con la
    // freccina del browser) con un bottone e un pannello a pillole nostri,
    // sullo stesso stile del menu hamburger (navbar.css, ".pallino-pagina-
    // corrente" per il pallino blu, "#navbarSupportedContent .nav-link" per
    // la pillola con bordo che si colora all'hover) - il <select> nativo
    // non e' ristilizzabile (limite della piattaforma, non nostro): il suo
    // menu a tendina lo disegna il sistema operativo/browser, CSS non puo'
    // toccarlo. Il <select> resta comunque nel DOM (solo nascosto): e'
    // ancora lui a sapere QUALI mesi sono disponibili nell'anno corrente
    // (flatpickr toglie da li' i mesi gia' passati, vedi "minDate"), lo
    // leggiamo per costruire le nostre pillole invece di ricalcolarlo
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
        // Il pannello NON va dentro "contenitoreMese" (".flatpickr-current-
        // month"): il suo antenato ".flatpickr-month" ha "overflow:hidden"
        // nel tema base di flatpickr (serve all'animazione di scorrimento tra
        // mesi) e taglierebbe via qualsiasi cosa sporga sotto la barra del
        // mese - il pannello risulterebbe "aperto" nel DOM ma invisibile.
        // Va agganciato invece a ".flatpickr-calendar" (posizionato,
        // overflow visibile) e posizionato "a mano" sotto al bottone ad ogni
        // apertura, perche' la sua posizione naturale nel documento non c'e'
        // piu'
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

        // Non legge "selectNativo.selectedIndex": dentro flatpickr.js,
        // "changeMonth" lancia l'evento "onMonthChange" PRIMA di chiamare
        // "updateNavigationCurrentMonth()" (che e' quella che aggiorna il
        // <select> nativo) - un callback agganciato a "onMonthChange" (come
        // questa funzione, vedi piu' sotto) leggerebbe quindi sempre il
        // valore ANCORA VECCHIO di "selectedIndex". "istanza.currentMonth"
        // (indice assoluto 0-11) e' invece gia' aggiornato a quel punto, e
        // corrisponde direttamente al "value" di ciascuna <option>
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
                    // "changeMonth" lancia da solo "onMonthChange" (vedi
                    // "aggiornaTestoBottone" sopra), che aggiorna gia' il
                    // testo del bottone - nessuna chiamata aggiuntiva
                    // necessaria qui
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

    // Un solo ascoltatore per tutta la pagina (non uno per ogni apertura
    // del pop-up, che si accumulerebbero ad ogni "+Nuovo avviso"/"Modifica"):
    // chiude il pannello del selettore mese, qualunque esso sia in questo
    // momento, se si clicca fuori
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
        // I due <input> restano nel DOM (non "hidden"/"type=hidden"):
        // flatpickr scrive li' il valore ad ogni click sul calendario, e
        // sono loro - non il calendario - a essere mandati al server nel
        // submit del form. "type=text" evita solo che il browser mostri
        // ANCHE il proprio selettore nativo sopra a quello di flatpickr
        inputInizio.setAttribute('type', 'text');
        inputFine.setAttribute('type', 'text');
        if (campiData) {
            campiData.hidden = true;
        }
        blocco.hidden = false;
        // Valore iniziale: letto direttamente dai due <input> (non da
        // flatpickr, che a init potrebbe non aver ancora sincronizzato
        // "rangePlugin" sul secondo campo) - copre sia il caso "+Nuovo
        // avviso" (campi vuoti) sia "Modifica" (gia' precompilati dal
        // server)
        var stato = {
            inizio: analizzaDataIso(inputInizio.value),
            fine: analizzaDataIso(inputFine.value)
        };
        aggiornaTestoPeriodo(elementoDataInizio, elementoDataFine, stato.inizio, stato.fine);
        // Distingue un intervallo DAVVERO scelto (due click) dalla semplice
        // ANTEPRIMA che flatpickr mostra passando il mouse sopra le date
        // mentre si sta ancora scegliendo la fine (stesse identiche classi
        // CSS "startRange"/"inRange"/"endRange" usate per entrambi i casi,
        // vedi flatpickr.js "onMouseOver" - da CSS puro sono indistinguibili).
        // Questa classe la aggiungiamo/togliamo noi stessi, solo quando
        // "stato" riflette una scelta reale, cosi' la pillola continua
        // (calendario-avvisi.css) compare solo a scelta confermata, mai
        // durante il solo passaggio del mouse
        function sincronizzaClasseIntervallo(istanza) {
            istanza.calendarContainer.classList.toggle('intervallo-completo', !!(stato.inizio && stato.fine));
        }
        // "rangePlugin" scrive il valore sul SECONDO <input> (data_fine)
        // solo dentro il proprio gestore dell'evento "onValueUpdate" di
        // flatpickr - evento che scatta SOLO se "setDate" viene chiamato
        // con "triggerChange" diverso da "false" (vedi flatpickr.js,
        // "updateValue"). Le nostre chiamate qui sotto usano sempre
        // "setDate([...], false)" apposta per non rilanciare "onChange" a
        // catena - ma questo lascia "data_fine" MAI aggiornato quando la
        // fine cambia per nostra scelta (sostituzione, singolo giorno):
        // il calendario sembra comunque corretto (il suo disegno si basa
        // su un altro stato interno di flatpickr, sempre aggiornato), ma
        // il valore REALE dell'<input> - quello che legge il salvataggio -
        // restava vuoto o vecchio. Va quindi scritto qui a mano, subito
        // dopo ogni "setDate([...], false)"
        function sincronizzaInputDate() {
            inputInizio.value = stato.inizio ? formattaDataIso(stato.inizio) : '';
            inputFine.value = stato.fine ? formattaDataIso(stato.fine) : '';
        }
        // Assegnata solo DOPO la creazione dell'istanza (serve l'istanza
        // stessa per costruire il selettore mese), ma le callback qui
        // sotto la usano solo quando vengono davvero invocate (mai
        // prima) - la chiusura JS sulla variabile la vede gia' assegnata
        var aggiornaBottoneMese = null;
        var istanzaFlatpickr = flatpickr(inputInizio, {
            plugins: [new rangePlugin({ input: inputFine })],
            dateFormat: 'Y-m-d',
            locale: 'it',
            inline: true,
            appendTo: contenitoreCalendario,
            // Non ha senso chiudere l'azienda per un periodo gia' passato:
            // i giorni prima di oggi restano visibili ma non selezionabili
            // (flatpickr li marca "flatpickr-disabled", colorati di grigio
            // in calendario-avvisi.css)
            minDate: 'today',
            // Tiene aggiornato il testo del bottone-mese personalizzato
            // (vedi "inizializzaSelettoreMese" sopra) quando il mese
            // cambia per un motivo diverso dal nostro stesso pannello -
            // le frecce prev/next dell'intestazione, o il cambio anno
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
            // Comportamento richiesto per dare "importanza" alle due date
            // gia' scelte, diverso dal default di flatpickr (che al terzo
            // click ricomincia sempre una selezione nuova da zero): se
            // l'intervallo e' gia' completo (due date), un click sulla data
            // di INIZIO azzera tutto, un click su una data diversa
            // sostituisce solo la FINE (scambiando le due se la nuova data
            // cade prima dell'attuale inizio, cosi' l'intervallo resta
            // sempre valido: inizio <= fine).
            //
            // "rangePlugin" pero' si mette in mezzo: quando rileva che un
            // click ha fatto passare la selezione da 2 date a 1 (il terzo
            // click "azzera e riparte" di flatpickr), la corregge lui
            // stesso PRIMA che "onChange" scatti, ricostruendo un
            // intervallo di 2 date con la data appena cliccata sempre in
            // prima posizione (come nuovo INIZIO, tenendo ferma la vecchia
            // fine) - l'opposto di quello che serve qui. Per questo
            // "dateSelezionate" arriva gia' sempre a 2 elementi (mai 1)
            // quando si clicca con un intervallo gia' completo: la data
            // REALMENTE cliccata e' sempre "dateSelezionate[0]" (la seconda
            // posizione invece riflette quello che "rangePlugin" CREDE
            // fosse la fine precedente, che puo' risultare non aggiornata
            // dopo una nostra correzione qui sotto, essendo scritta con
            // "setDate(..., false)" apposta per non fargliela notare -
            // "false" = non rilanciare "onChange" - va quindi ignorata e
            // ricalcolata sempre da "stato", l'unica fonte affidabile)
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
                    // Primo/secondo click "normali" (nessun intervallo
                    // precedente completo: qui "rangePlugin" non interviene)
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
        // Stato iniziale della classe (es. "Modifica" apre il calendario
        // gia' con inizio/fine precompilati dal server: la pillola deve
        // essere visibile subito, non solo dopo la prossima scelta)
        sincronizzaClasseIntervallo(istanzaFlatpickr);
        aggiornaBottoneMese = inizializzaSelettoreMese(istanzaFlatpickr);

        // Se si passa al campo successivo (motivo chiusura) avendo scelto
        // solo la data di inizio, si intende una chiusura di un solo
        // giorno: la data di fine diventa uguale a quella di inizio,
        // invece di restare vuota (obbligando altrimenti a ri-cliccare la
        // stessa data sul calendario solo per confermarla come fine).
        // Se la fine e' gia' impostata (un vero intervallo di piu' giorni
        // gia' scelto) non si tocca nulla
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
        // L'apertura del modal per "+Nuovo avviso" resta dichiarativa
        // (data-bs-toggle/data-bs-target su questo bottone in
        // gestione_avvisi.html, gestita direttamente da Bootstrap)
        btnNuovo.addEventListener('click', function () {
            modalBody.innerHTML = formInizialeHTML;
            // "innerHTML =" e' una scrittura diretta nel DOM, non uno swap
            // gestito da htmx: senza questa chiamata, htmx non si
            // accorgerebbe del nuovo <form hx-post=...> appena inserito e
            // un submit da qui risulterebbe in una normale navigazione di
            // pagina invece che in una richiesta htmx
            htmx.process(modalBody);
            inizializzaCalendarioDate(modalBody);
        });
    }

    // "Modifica" (partials/tabella_avvisi.html) usa "hx-get" per caricare
    // nel modal il form gia' precompilato dal server con i dati dell'avviso
    // (Avvisi/views.py, "modifica_avviso" risponde anche a GET) - a
    // differenza di "+Nuovo avviso" qui l'apertura del modal non puo' essere
    // dichiarativa: va aperto solo DOPO che il contenuto e' arrivato,
    // altrimenti si vedrebbe per un istante il form di una modifica
    // precedente (o quello vuoto di "+Nuovo avviso"). Lo stesso evento
    // copre anche il form ri-mostrato nel modal dopo un errore di
    // validazione (vedi "htmx:beforeSwap" piu' sotto): in entrambi i casi i
    // campi data sono <input> nuovi di zecca, serve reinizializzare
    // flatpickr
    document.addEventListener('htmx:afterSwap', function (event) {
        if (event.detail.target !== modalBody) {
            return;
        }
        inizializzaCalendarioDate(modalBody);
        if (event.detail.requestConfig && event.detail.requestConfig.verb === 'get') {
            modalBootstrap.show();
        }
    });

    // Il toggle "attivo" e il bottone "Elimina" (partials/tabella_avvisi.html)
    // sono gestiti interamente da htmx (hx-post/hx-target/
    // hx-swap="morph:outerHTML" sull'elemento stesso, "hx-confirm" per
    // l'elimina), nessun listener JS per loro.

    // Caricamento di "Modifica" fallito in modo imprevisto (avviso
    // cancellato da un altro utente nel frattempo, sessione scaduta, ...) -
    // un modal vuoto/rotto sarebbe peggio di un reload. Il controllo sul
    // verb "get" e' cio' che distingue questo caso dagli errori di
    // toggle/elimina (bottoni POST nello stesso container), che restano sul
    // comportamento di default di htmx (nessuno swap, nessun crash)
    tabellaContainer.addEventListener('htmx:responseError', function (event) {
        if (event.detail.requestConfig && event.detail.requestConfig.verb === 'get') {
            window.location.reload();
        }
    });

    // Il form di salvataggio (partials/form_avviso.html) ha hx-target=
    // "#tabella-avvisi"/hx-swap="morph:outerHTML" - corretto per il caso di
    // successo (200). Per un errore di validazione (400), la view
    // (Avvisi/views.py, "_risposta_form_errori") manda gli header
    // "HX-Retarget"/"HX-Reswap" per sostituire invece il contenuto del
    // modal. Due cose non ovvie rendono necessario questo listener:
    // 1) htmx non applica MAI lo swap di default fuori dal range 2xx (vedi
    //    htmx.config.responseHandling) - un 400 arriverebbe fino a
    //    "beforeSwap" ma lo swap resterebbe bloccato, quindi va forzato
    //    esplicitamente qui (il 400 e' un caso "buono": form con errori di
    //    validazione da mostrare, non un errore imprevisto);
    // 2) quando HX-Retarget cambia il bersaglio, "htmx:beforeSwap" scatta
    //    comunque fisicamente sul bersaglio ORIGINALE dichiarato da
    //    hx-target sul form ("#tabella-avvisi", che non e' un antenato di
    //    modalBody) - solo "event.detail.target" riflette il nuovo
    //    bersaglio. Un listener su modalBody non riceverebbe mai questo
    //    evento: va messo su "document", che e' antenato di entrambi.
    document.addEventListener('htmx:beforeSwap', function (event) {
        if (event.detail.target === modalBody) {
            event.detail.shouldSwap = true;
        }
    });

    // Chiude il modal solo dopo un salvataggio riuscito (200) - il caso 400
    // (errori di validazione, da mostrare nel modal) e' gestito sopra.
    modalBody.addEventListener('htmx:afterRequest', function (event) {
        var status = event.detail.xhr.status;
        if (status >= 200 && status < 300) {
            modalBootstrap.hide();
        }
    });

    // Errore imprevisto sulla richiesta di salvataggio (403 CSRF scaduto,
    // 404, 500, ...) - il 400 e' l'unico status di errore "buono" (gestito
    // sopra), per tutti gli altri un frammento non e' affidabile da
    // mostrare, un reload riporta a uno stato coerente. A differenza di
    // "beforeSwap", "htmx:responseError" scatta sempre sull'elemento che ha
    // fatto la richiesta (il form, dentro modalBody), quindi qui l'ascolto
    // su modalBody arriva regolarmente per bubbling
    modalBody.addEventListener('htmx:responseError', function (event) {
        if (event.detail.xhr.status !== 400) {
            window.location.reload();
        }
    });

    // Richiesta mai arrivata a destinazione (rete assente, server giu'):
    // stesso principio del ".catch()" di una fetch scritta a mano - un
    // reload e' l'unico modo sicuro di recuperare
    modalBody.addEventListener('htmx:sendError', function () {
        window.location.reload();
    });
})();
