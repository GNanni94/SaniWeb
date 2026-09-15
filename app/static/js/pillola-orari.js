(function () {
  var pillola = document.getElementById('pillola-orari');
  if (!pillola) return;

  var ORARIO_APERTURA = parseInt(pillola.dataset.apertura, 10);
  var ORARIO_CHIUSURA = parseInt(pillola.dataset.chiusura, 10);
  var PRANZO_INIZIO = parseInt(pillola.dataset.pranzoInizio, 10);
  var PRANZO_FINE = parseInt(pillola.dataset.pranzoFine, 10);
  var SOGLIA_VICINO_CHIUSURA = 60;

  var TESTO_APERTO = pillola.dataset.testoAperto;
  var TESTO_VICINO_CHIUSURA = pillola.dataset.testoVicinoChiusura;
  var TESTO_PRANZO = pillola.dataset.testoPranzo;
  var TESTO_CHIUSO_FERIALE = pillola.dataset.testoChiusoFeriale;
  var TESTO_CHIUSO_WEEKEND = pillola.dataset.testoChiusoWeekend;

  function aggiornaPillola() {
    var ora = new Date();
    var giorno = ora.getDay();
    var minutiOra = ora.getHours() * 60 + ora.getMinutes();

    var classe, testo;

    if (giorno === 0 || giorno === 6 || (giorno === 5 && minutiOra >= ORARIO_CHIUSURA)) {
      classe = 'bg-danger';
      testo = TESTO_CHIUSO_WEEKEND;
    } else if (minutiOra < ORARIO_APERTURA || minutiOra >= ORARIO_CHIUSURA) {
      classe = 'bg-danger';
      testo = TESTO_CHIUSO_FERIALE;
    } else if (minutiOra >= PRANZO_INIZIO && minutiOra <= PRANZO_FINE) {
      classe = 'bg-warning text-dark';
      testo = TESTO_PRANZO;
    } else if (minutiOra >= ORARIO_CHIUSURA - SOGLIA_VICINO_CHIUSURA) {
      classe = 'badge-orario-arancione';
      testo = TESTO_VICINO_CHIUSURA;
    } else {
      classe = 'bg-success';
      testo = TESTO_APERTO;
    }

    pillola.className = 'badge rounded-pill px-3 py-2 fs-6 pillola-orari ' + classe;
    pillola.textContent = testo;
  }

  aggiornaPillola();
  setInterval(aggiornaPillola, 60000);
})();
