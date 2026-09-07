$(document).ready(function () {
    // Tipo di paginazione personalizzato: mostra sempre prima pagina, ultima
    // pagina, e un numero centrale per la pagina corrente
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
            // Soglia fissa a 576px per il breakpoint "telefono"
            "breakpoints": [
                { "name": "desktop", "width": Infinity },
                { "name": "phone", "width": 576 }
            ],
            "details": {
                // Colonna NOME (indice 1) cliccabile per aprire/chiudere i
                // dettagli nascosti su telefono
                "target": 1,
                // Renderer dei dettagli responsive: esclude la colonna
                // "Aggiungi al preventivo" (indice 4) dalla lista
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
            // Solo la chiave "url" qui - altre chiavi vanno aggiunte via JS
            // in "initComplete"
            "url": listaProdottiTabella.dataset.i18nUrl
        },
        "initComplete": function () {
            var api = this.api();

            // Costruisce attorno al campo di ricerca generato da DataTables
            // la stessa struttura ".ricerca-a-comparsa > .ricerca-form >
            // input + bottone" usata in prodotti_card.html, per riusare il
            // filtro live che DataTables ha gia'
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
            // Wrapper con larghezza fissa (niente "flex-grow-1"):
            // ".ricerca-a-comparsa" fissa gia' "width: 12rem", "input-group"
            // (Bootstrap) da' il display:flex al contenitore
            var $wrapperRicerca = $('<div class="ricerca-a-comparsa flex-shrink-1" id="ricercaTabellaWrapper" style="min-width: 0;"></div>')
                .append($('<div class="input-group ricerca-form"></div>').append($inputRicerca).append($bottoneRicerca));

            // Aggiunge il wrapper di ricerca dopo il filtro, nella riga del titolo
            $('#controlliRicercaFiltroTabellaWrapper').append($wrapperRicerca);
            $filterDiv.remove();

            // Toglie "tabella-in-caricamento" dopo un breve ritardo, quando
            // DataTables Responsive si e' assestata
            setTimeout(function () {
                $('#listProdottiTable').removeClass('tabella-in-caricamento');
            }, 100);

            // Da telefono la lente si apre al click e mette il focus nel
            // campo; si richiude cliccando fuori se il campo e' vuoto
            var wrapperRicercaEl = document.getElementById('ricercaTabellaWrapper');
            var bottoneRicercaEl = wrapperRicercaEl.querySelector('.ricerca-toggle-btn');
            var inputRicercaEl = wrapperRicercaEl.querySelector('.ricerca-a-comparsa-input');
            // Allargamento del cerchio mentre la tastiera virtuale sale e
            // ancoraggio del wrapper al viewport visivo
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
                // Focus immediato con "preventScroll": fa partire subito la
                // tastiera nativa, da cui dipendono gli eventi "resize"
                inputRicercaEl.focus({ preventScroll: true });
            });

            // Richiude il campo cliccando fuori se e' vuoto: "blur()" fa
            // partire la chiusura della tastiera nativa, con fallback
            // immediato se lo spazio occupato e' gia' zero
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

            // Bordo bianco quando il cerchio di ricerca finisce sopra il footer di pagina
            var aggiornaBordoSuSfondoBlu = creaAggiornatoreSuSfondoBlu(function () {
                return wrapperRicercaEl;
            }, 'su-sfondo-blu');

            // Forza un ridisegno del browser dopo che DataTables Responsive
            // ricalcola le colonne al cambio di breakpoint, toccando
            // "transform" e togliendolo al frame successivo
            $('#listProdottiTable').on('responsive-resize.dt', function () {
                var tabella = document.getElementById('listProdottiTable');
                tabella.style.transform = 'translateZ(0)';
                requestAnimationFrame(function () {
                    tabella.style.transform = '';
                });
            });

            // Sostituisce il testo dei bottoni Precedente/Successivo con i
            // simboli "«"/"»", ripetuto ad ogni "draw" perche' i bottoni
            // vengono ricreati da DataTables
            function sostituisciSimboliPrecedenteSuccessivo() {
                var bottonePrecedente = document.querySelector('#listProdottiTable_wrapper .paginate_button.previous');
                var bottoneSuccessivo = document.querySelector('#listProdottiTable_wrapper .paginate_button.next');
                if (bottonePrecedente) {
                    bottonePrecedente.textContent = '«';
                }
                if (bottoneSuccessivo) {
                    bottoneSuccessivo.textContent = '»';
                }
            }
            sostituisciSimboliPrecedenteSuccessivo();
            $('#listProdottiTable').on('draw.dt', sostituisciSimboliPrecedenteSuccessivo);

            // Icona del filtro piena solo quando e' selezionata una
            // sottocategoria specifica, a contorno su "Tutte le
            // sottocategorie" (sempre la prima voce del menu)
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

            // Delegato sul menu invece che sulle singole voci
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
                // Ricerca esatta (non per sottostringa) sulla colonna SottoCategoria (indice 3)
                var termine = valore ? '^' + $.fn.dataTable.util.escapeRegex(valore) + '$' : '';
                api.column(3).search(termine, true, false).draw();
            });
        }
    });
});
