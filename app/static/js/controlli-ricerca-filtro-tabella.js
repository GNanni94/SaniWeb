$(document).ready(function () {
    // Tipo di paginazione personalizzato: mostra sempre la prima pagina (1) e
    // l'ultima (33), e un solo numero centrale che rappresenta la pagina
    // corrente (di default "2" quando si e' in pagina 1, poi sostituito dal
    // numero della pagina corrente man mano che ci si sposta), invece della
    // finestra di piu' numeri consecutivi che offre di default DataTables
    $.fn.dataTable.ext.pager.uno_corrente_ultimo = function (page, pages) {
        var numbers;

        if (pages <= 3) {
            // Poche pagine in tutto: le mostriamo tutte, l'ellissi non serve
            numbers = [];
            for (var i = 0; i < pages; i++) {
                numbers.push(i);
            }
        }
        else if (page === 0) {
            numbers = [0, 1, 'ellipsis', pages - 1]; // pagina 1: "1 2 ... 33"
        }
        else if (page === pages - 2) {
            numbers = [0, 'ellipsis', page, pages - 1]; // ultima pagina: "1 ... 33"
        }
        else if (page === pages - 1) {
            numbers = [0, 'ellipsis', page - 1, pages - 1]; // ultima pagina: "1 ... 33"
        }
        else {
            numbers = [0, page, page + 1,  'ellipsis', pages - 1]; // pagine intermedie: "1 ... 33"
        }

        numbers.DT_el = 'span';
        return ['previous', numbers, 'next'];
    };

    var listaProdottiTabella = document.getElementById('listProdottiTable');

    $('#listProdottiTable').DataTable({
        "pagingType": "uno_corrente_ultimo",
        "lengthChange": false, // toglie il selettore "Show x entries"
        "info": false, // toglie la scritta "Risultati da X a Y di Z elementi"
        "ordering": false, // toglie le frecce di ordinamento e il click sulle intestazioni per ordinare
        "responsive": {
            // Soglia fissa (576px, la stessa usata altrove nel sito per "telefono")
            // invece di lasciare che DataTables decida da solo in base al contenuto:
            // con testi brevi (es. "Kg") le colonne "ci starebbero" comunque compresse
            // senza mai passare al "+", quindi serve un limite di larghezza esplicito
            "breakpoints": [
                { "name": "desktop", "width": Infinity },
                { "name": "phone", "width": 576 }
            ],
            "details": {
                // Colonna cliccabile per aprire/chiudere i dettagli nascosti su
                // telefono: NOME (indice 1) invece della prima colonna di default
                // (CODICE PRODOTTO) - la freccina di default viene poi nascosta
                // via CSS (".dtr-control:before" in main.css), cosi' e' il testo
                // del nome stesso a fare da bottone, senza icona separata
                "target": 1,
                // Renderer come quello di default di DataTables Responsive, ma
                // esclude la colonna "Aggiungi al preventivo" (indice 4, dopo
                // la rimozione della colonna "CATEGORIA") dalla lista:
                // combinare le classi "min-phone" e "none" non basta (bug di
                // parsing nella libreria quando sono unite), quindi la si esclude
                // qui a mano - l'icona nella cella del NOME la sostituisce gia'
                "renderer": function (api, rowIdx, columns) {
                    var data = columns
                        .filter(function (col) {
                            return col.hidden && col.columnIndex !== 4;
                        })
                        .map(function (col) {
                            return '<li data-dtr-index="' + col.columnIndex + '" data-dt-row="' + col.rowIndex + '" data-dt-column="' + col.columnIndex + '">' +
                                '<span class="dtr-title">' + col.title + '</span> ' +
                                '<span class="dtr-data">' + col.data + '</span>' +
                                '</li>';
                        })
                        .join('');

                    return data ? $('<ul data-dtr-index="' + rowIdx + '" class="dtr-details"/>').append(data) : false;
                }
            }
        },
        "columnDefs": [
            { "className": "all", "targets": 1 },                 // NOME: sempre visibile, a sinistra
            { "className": "min-phone", "targets": [0, 2, 3, 4] } // resto: visibile da 576px in su, sotto nascosto (0,2,3 nel "+", 4 escluso dal renderer sopra)
        ],
        "language": {
            // NOTA: non aggiungere altre chiavi qui dentro (es. "search",
            // "searchPlaceholder") insieme a "url" - causa la mancata
            // applicazione della traduzione italiana caricata dall'url
            // (la tabella torna in inglese). Personalizzazioni del testo
            // vanno fatte via JS in "initComplete", non qui
            "url": listaProdottiTabella.dataset.i18nUrl
        },
        "initComplete": function () {
            var api = this.api();

            // Ricerca con lo stesso aspetto "a comparsa" di
            // prodotti_card.html (classi ".ricerca-a-comparsa" riusabile in
            // prodotti.css, gia' usata anche in
            // dashboard_prodotti_senza_immagine.html): il filtro
            // sottocategoria e' gia' nella riga del titolo, renderizzato
            // lato server da "partials/controlli_ricerca_filtro_tabella.html"
            // (passato come "controlli_template" a
            // "partials/intestazione_categoria.html" nel template) - qui si
            // aggiunge solo la ricerca, accanto a lui, nello stesso wrapper.
            // Il campo di ricerca e' quello generato da DataTables stesso
            // (esiste solo da qui in poi): gli si costruisce attorno la
            // stessa struttura ".ricerca-a-comparsa > .ricerca-form >
            // input + bottone" invece di crearne uno nuovo, cosi' resta
            // cablato sul filtro live di DataTables che ha gia' di suo.
            // Larghezza propria fissa (non piu' agganciata a quella delle
            // colonne), quindi non serve nessuna sincronizzazione via JS:
            // si mostra subito, senza attendere nessun ricalcolo.
            var $filterDiv = $('#listProdottiTable_filter');
            var $inputRicerca = $filterDiv.find('input')
                .attr('id', 'ricercaTabellaProdotti')
                .removeClass()
                .addClass('form-control ricerca-a-comparsa-input')
                .attr('placeholder', 'Cerca...');
            var $bottoneRicerca = $(
                '<button type="button" class="ricerca-toggle-btn" aria-expanded="false" '
                + 'aria-controls="ricercaTabellaProdotti" title="Cerca" aria-label="Cerca">'
                + '<i class="bi bi-search"></i></button>'
            );
            // Niente "flex-grow-1" qui (a differenza del filtro): la classe
            // ".ricerca-a-comparsa" fissa gia' da sola "width: 12rem" da
            // 576px in su (vedi prodotti.css) - un "flex-grow" in piu' la
            // farebbe crescere oltre, riempiendo lo spazio lasciato libero
            // dal filtro invece di restare della stessa larghezza fissa di
            // prodotti_card.html
            // "input-group" oltre a "ricerca-form": e' lei (Bootstrap) a
            // dare "display:flex" a questo contenitore, ".ricerca-form" da
            // sola aggiunge solo le proprieta' sopra - senza, il bottone
            // finisce in flusso a blocco sotto il campo invece che
            // affiancato/centrato, e "overflow:hidden" lo taglia via.
            // Stessa coppia di classi di prodotti_card.html/
            // dashboard_prodotti_senza_immagine.html
            var $wrapperRicerca = $('<div class="ricerca-a-comparsa flex-shrink-1" id="ricercaTabellaWrapper" style="min-width: 0;"></div>')
                .append($('<div class="input-group ricerca-form"></div>').append($inputRicerca).append($bottoneRicerca));

            // Aggiunta dopo il filtro (gia' presente, stesso ordine di
            // prodotti_card.html) dentro lo stesso wrapper renderizzato dal
            // partial, nella riga del titolo - non piu' una riga a parte
            // sopra la tabella
            $('#controlliRicercaFiltroTabellaWrapper').append($wrapperRicerca);
            $filterDiv.remove();

            // La tabella resta nascosta ("tabella-in-caricamento") finche'
            // DataTables Responsive non si e' assestata (ricalcola ancora
            // un po' dopo "initComplete"): stesso breve ritardo di prima,
            // non piu' legato pero' alla sincronizzazione di ricerca/filtro
            // (che non serve piu', vedi sopra)
            setTimeout(function () {
                $('#listProdottiTable').removeClass('tabella-in-caricamento');
            }, 100);

            // Da telefono la lente si apre al click e mette il focus nel
            // campo (il filtro e' gia' live mentre si scrive, quindi - a
            // differenza di prodotti_card.html - un secondo click sulla
            // lente gia' aperta non deve fare nulla: non c'e' nessun form
            // da sottomettere). Si richiude da sola cliccando fuori se il
            // campo e' rimasto vuoto, stesso comportamento di
            // prodotti_card.html
            var wrapperRicercaEl = document.getElementById('ricercaTabellaWrapper');
            var bottoneRicercaEl = wrapperRicercaEl.querySelector('.ricerca-toggle-btn');
            var inputRicercaEl = wrapperRicercaEl.querySelector('.ricerca-a-comparsa-input');
            // Allargamento progressivo del cerchio mentre la tastiera
            // virtuale sale e ancoraggio del wrapper fluttuante al viewport
            // visivo: logica condivisa in ricerca-tastiera-virtuale.js
            // (caricato prima di questo file), usata anche da
            // controlli-ricerca-filtro-card.js.
            var wrapperFluttuanteTabella = document.getElementById('controlliRicercaFiltroTabellaWrapper');
            var gestoreTastiera = creaGestoreTastieraVirtuale({
                wrapper: wrapperRicercaEl,
                bottoneToggle: bottoneRicercaEl,
                wrapperFluttuante: wrapperFluttuanteTabella
            });

            bottoneRicercaEl.addEventListener('click', function () {
                if (wrapperRicercaEl.classList.contains('ricerca-espansa')) {
                    return;
                }
                gestoreTastiera.resetTastieraSalita();
                wrapperRicercaEl.classList.add('ricerca-espansa');
                bottoneRicercaEl.setAttribute('aria-expanded', 'true');
                // Focus subito, non piu' ritardato a transizione finita:
                // "preventScroll" toglie gia' da solo il motivo per cui
                // prima si aspettava, e il focus immediato fa partire prima
                // la tastiera nativa, da cui dipendono gli eventi "resize"
                // che pilotano "applicaLarghezzaDaTastiera" (ricerca-tastiera-virtuale.js)
                inputRicercaEl.focus({ preventScroll: true });
            });

            // Richiude il campo se si clicca fuori mentre e' vuoto.
            // "inputRicercaEl.blur()" (non piu' la rimozione diretta di
            // ".ricerca-espansa") fa partire la chiusura nativa della
            // tastiera: il resto si finalizza dentro
            // "applicaLarghezzaDaTastiera" quando la tastiera e'
            // scesa del tutto. Se non c'era nessuna tastiera da chiudere
            // (es. tastiera fisica, o "visualViewport" non supportato) non
            // arriverebbe pero' nessun evento "resize" a finalizzare: si
            // controlla quindi anche qui, chiudendo subito se lo spazio
            // occupato e' gia' zero
            document.addEventListener('click', function (event) {
                if (!wrapperRicercaEl.classList.contains('ricerca-espansa') || wrapperRicercaEl.contains(event.target)) {
                    return;
                }
                if (inputRicercaEl.value.trim() === '') {
                    inputRicercaEl.blur();
                    if (gestoreTastiera.spazioOccupatoDallaTastiera() === 0) {
                        wrapperRicercaEl.classList.remove('ricerca-espansa');
                        bottoneRicercaEl.setAttribute('aria-expanded', 'false');
                        wrapperRicercaEl.style.width = '';
                    }
                }
            });

            // Bordo bianco (".su-sfondo-blu" in prodotti.css) quando il
            // cerchio della ricerca finisce sopra il footer di pagina -
            // logica condivisa in sovrapposizione-sfondo-blu.js (caricato
            // prima di questo file in prodotti_tabella.html). Nessun
            // selettore di card passato qui (a differenza di
            // prodotti_card.html): questa pagina mostra una tabella, non
            // card con un proprio footer blu da controllare in 2D
            var aggiornaBordoSuSfondoBlu = creaAggiornatoreSuSfondoBlu(function () {
                return wrapperRicercaEl;
            }, 'su-sfondo-blu');

            // Bug osservato (Chrome, debug con l'utente): passando da desktop
            // a telefono le righe restano vuote a schermo finche' non si
            // ricarica la pagina. Verificato con diagnostica dal vivo: il DOM
            // e gli stili calcolati sono SEMPRE corretti (contenuto, colore,
            // altezza) anche quando lo schermo mostra vuoto - non e' quindi
            // un problema nei nostri dati o nel nostro CSS, ma un mancato
            // ridisegno del browser dopo che DataTables Responsive nasconde/
            // mostra molte celle in una volta sola al cambio di breakpoint.
            // Non legato a ricerca/filtro sopra (li' il problema era solo la
            // loro sincronizzazione di larghezza, rimossa): resta quindi
            // invariato anche dopo la rimozione di quella sincronizzazione.
            // "responsive-resize.dt" e' l'evento che DataTables Responsive
            // lancia sulla tabella subito DOPO aver finito di ricalcolare le
            // colonne (a differenza del semplice "resize" della finestra, che
            // puo' scattare mentre il ricalcolo e' ancora in corso): qui si
            // forza un ridisegno (toccare "transform" e poi toglierlo al
            // frame successivo e' un workaround comune per bug di questo tipo
            // nei browser Chromium)
            $('#listProdottiTable').on('responsive-resize.dt', function () {
                var tabella = document.getElementById('listProdottiTable');
                tabella.style.transform = 'translateZ(0)';
                requestAnimationFrame(function () {
                    tabella.style.transform = '';
                });
            });

            // Icona del filtro piena ("bi-funnel-fill", contenuto bianco)
            // solo quando e' selezionata una sottocategoria specifica, a
            // contorno ("bi-funnel", il contenuto lascia trasparire il blu
            // del cerchio sotto) su "Tutte le sottocategorie" - stesso
            // comportamento di prodotti_card.html
            // ("aggiornaClasseFiltroAttivo" in filtro-prodotti-ajax.js, non
            // caricato qui). La prima voce del menu e' sempre "Tutte le
            // sottocategorie" (vedi
            // partials/controlli_ricerca_filtro_tabella.html), quindi basta
            // guardare se lei ha la classe "active" per riconoscere lo
            // stato "nessun filtro attivo"
            var filtroWrapperTabella = document.getElementById('filtroTabellaWrapper');
            var iconaFiltro = filtroWrapperTabella.querySelector('.filtro-icon-overlay');
            var listaFiltroTabella = filtroWrapperTabella.querySelector('.filtro-dropdown-menu');

            function aggiornaClasseFiltroAttivo() {
                var primaVoce = listaFiltroTabella.querySelector('.filtro-dropdown-item');
                var attivo = !primaVoce.classList.contains('active');
                iconaFiltro.classList.toggle('bi-funnel-fill', attivo);
                iconaFiltro.classList.toggle('bi-funnel', !attivo);
            }

            aggiornaClasseFiltroAttivo();

            // Delegato sul menu (non sulle singole voci), stessa tecnica di
            // "filtro-prodotti-ajax.js" in prodotti_card.html
            listaFiltroTabella.addEventListener('click', function (event) {
                var voce = event.target.closest('.filtro-dropdown-item');
                if (!voce) {
                    return;
                }
                event.preventDefault();
                var voci = listaFiltroTabella.querySelectorAll('.filtro-dropdown-item');
                for (var i = 0; i < voci.length; i++) {
                    voci[i].classList.toggle('active', voci[i] === voce);
                }
                aggiornaClasseFiltroAttivo();
                var valore = voce.dataset.valore;
                // Ricerca esatta (non per sottostringa) sulla colonna SottoCategoria
                // (indice 3, dopo la rimozione della colonna "CATEGORIA"), altrimenti
                // selezionare una sottocategoria il cui nome e' contenuto in quello
                // di un'altra la filtrerebbe assieme
                var termine = valore ? '^' + $.fn.dataTable.util.escapeRegex(valore) + '$' : '';
                api.column(3).search(termine, true, false).draw();
            });
        }
    });
});
