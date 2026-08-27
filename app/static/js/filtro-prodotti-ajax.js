// Aggiorna la griglia prodotti (filtro sottocategoria, ricerca, paginazione)
// via AJAX invece di un reload completo della pagina - vedi
// Docs/AJAX/prodotti_card.md per il perche' e le scelte di design.
(function () {
    var container = document.getElementById('listaProdottiContainer');
    var filtro = document.getElementById('prodottiCardFiltro');
    var formRicerca = document.getElementById('ricercaProdottiForm');
    if (!container) {
        return;
    }

    // Fix: token di sequenza al posto del guard "ignora se gia' in corso".
    // Una richiesta piu' recente deve SUPERARE quella precedente ancora in
    // volo (non venire scartata), cosi' select/URL/griglia restano sempre
    // allineati con l'ULTIMA azione dell'utente anche se le risposte di
    // rete arrivano fuori ordine.
    var richiestaCorrente = 0;

    // Scroll fino in cima alla pagina a velocita' costante: "scrollIntoView"/
    // "scrollTo" nativi con behavior:"smooth" non permettono di controllare
    // la velocita' (dipende da browser/OS), quindi si anima a mano con
    // requestAnimationFrame. Velocita' fissa in px/ms (non durata fissa):
    // cosi' il movimento e' sempre alla stessa velocita' "normale" a
    // prescindere da quanto si e' scrollati in basso, senza accelerare ne'
    // rallentare durante il movimento (nessun easing, progressione lineare)
    var VELOCITA_SCROLL_PX_MS = 3;

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
            // behavior:"auto" esplicito (non la forma "scrollTo(x, y)"): se
            // il documento avesse "scroll-behavior: smooth" in CSS (da
            // qualunque origine, anche non di questo progetto), la forma
            // breve lo rispetterebbe comunque e ogni singolo scatto verrebbe
            // a sua volta ri-animato dal browser sopra alla nostra
            // animazione, sommando due movimenti e risultando in un
            // andamento innaturale invece che a velocita' costante
            window.scrollTo({ top: partenza * (1 - progresso), left: 0, behavior: 'auto' });
            if (progresso < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    function caricaConAjax(url, scrollInCima) {
        var idRichiesta = ++richiestaCorrente;
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
                    // Una richiesta piu' recente e' gia' partita nel
                    // frattempo: questa risposta e' superata, non va
                    // applicata
                    return;
                }
                // Fix: il partial griglia_prodotti.html ha <div id="listaProdottiContainer">
                // come radice. Inserire l'HTML grezza causarebbe il doppio-wrapping dell'id.
                // Estraiamo solo il contenuto interno del div ricevuto.
                var tmp = document.createElement('div');
                tmp.innerHTML = html.trim();
                var nuovoContenuto = tmp.firstElementChild;
                if (!nuovoContenuto || nuovoContenuto.id !== 'listaProdottiContainer') {
                    // La risposta non e' il partial atteso (es. e' arrivata
                    // una pagina intera invece del frammento): fallback
                    // alla navigazione normale invece di svuotare la griglia
                    window.location.href = url;
                    return;
                }
                container.innerHTML = nuovoContenuto.innerHTML;
                // Sincronizza il campo nascosto della ricerca e il
                // titolo/tab del browser con lo stato appena ricevuto dal
                // server (sempre corretto per la pagina/sottocategoria
                // mostrata, letto dai data-* del nuovo contenuto)
                var hiddenSottocategoria = document.getElementById('ricercaSottocategoriaHidden');
                if (hiddenSottocategoria) {
                    hiddenSottocategoria.value = nuovoContenuto.dataset.sottocategoria || '';
                }
                var titoloLink = document.getElementById('titoloCategoriaLink');
                if (titoloLink) {
                    titoloLink.textContent = nuovoContenuto.dataset.nomeCategoria;
                }
                document.title = nuovoContenuto.dataset.nomeCategoria;
                // "replaceState", non "pushState": l'URL nella barra degli
                // indirizzi resta corretto (condivisibile/bookmarkabile),
                // ma senza aggiungere voci alla cronologia - un solo
                // "indietro" del browser riporta l'utente alla pagina
                // precedente vera (es. il Catalogo), senza tappe
                // intermedie per ogni filtro/pagina cambiati qui
                history.replaceState(null, '', url);
                // Solo la paginazione scrolla (in cima alla pagina, non solo
                // all'inizio del container): il cambio filtro non deve
                // spostare la vista, l'utente ha appena interagito col
                // filtro stesso e vederlo "saltare" via sarebbe fastidioso
                if (scrollInCima) {
                    scrollDolceInCima();
                }
            })
            .catch(function () {
                // Fallback: reload completo classico, stesso comportamento
                // di prima di introdurre l'AJAX
                if (idRichiesta === richiestaCorrente) {
                    window.location.href = url;
                }
            })
            .finally(function () {
                if (idRichiesta === richiestaCorrente) {
                    container.classList.remove('lista-prodotti-in-caricamento');
                }
            });
    }

    if (filtro) {
        filtro.addEventListener('change', function () {
            if (this.value) {
                caricaConAjax(this.value, false);
            }
        });
    }

    if (formRicerca) {
        // Intercetta sia l'invio da tastiera (Enter nel campo) sia il
        // "form.requestSubmit()" gia' chiamato dal bottone-lente su mobile
        // (script IIFE piu' sotto in prodotti_card.html): entrambi fanno
        // scattare l'evento "submit" del form, quindi basta un solo listener
        formRicerca.addEventListener('submit', function (event) {
            event.preventDefault();
            var parametri = new URLSearchParams(new FormData(formRicerca));
            // Stesso comportamento del cambio filtro: niente scroll, l'utente
            // ha appena interagito col box di ricerca stesso
            caricaConAjax(formRicerca.action + '?' + parametri.toString(), false);
        });
    }

    // Link del titolo ("torna alla lista completa" della stessa categoria,
    // senza sottocategoria/ricerca): a differenza dei link di paginazione
    // sotto, questo elemento non viene mai rigenerato da uno swap AJAX (sta
    // fuori da "#listaProdottiContainer", il JS gli aggiorna solo il testo -
    // vedi "caricaConAjax"), quindi un listener diretto basta, non serve
    // delegazione. Href fisso (sempre la stessa categoria), letto ad ogni
    // click cosi' da restare valido anche se cambiasse
    var titoloLink = document.getElementById('titoloCategoriaLink');
    if (titoloLink) {
        titoloLink.addEventListener('click', function (event) {
            event.preventDefault();
            // Il filtro sottocategoria (fuori da "#listaProdottiContainer",
            // come il titolo stesso) non si aggiorna da solo con lo swap
            // della griglia: senza questo, dopo aver cliccato il titolo da
            // una sottocategoria filtrata, la select mostrerebbe ancora
            // quella sottocategoria anche se la griglia ora mostra la
            // categoria intera. "selectedIndex = 0" invece di confrontare
            // i due URL: la prima "<option>" e' sempre "Tutte le
            // sottocategorie" (vedi prodotti_card.html)
            if (filtro) {
                filtro.selectedIndex = 0;
            }
            caricaConAjax(titoloLink.href, false);
        });
    }

    // Delegazione sul container (non sui singoli link): funziona anche sui
    // link di paginazione rigenerati dopo ogni swap di innerHTML, senza
    // dover ri-agganciare l'evento ogni volta
    container.addEventListener('click', function (event) {
        var link = event.target.closest('a.page-link');
        if (!link) {
            return;
        }
        event.preventDefault();
        caricaConAjax(link.href, true);
    });
})();
