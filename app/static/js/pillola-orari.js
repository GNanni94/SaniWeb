(function () {
  var pillola = document.getElementById('pillola-orari');
  if (!pillola) return;

  var ORARIO_APERTURA = parseInt(pillola.dataset.apertura, 10);
  var ORARIO_CHIUSURA = parseInt(pillola.dataset.chiusura, 10);
  var PRANZO_INIZIO = parseInt(pillola.dataset.pranzoInizio, 10);
  var PRANZO_FINE = parseInt(pillola.dataset.pranzoFine, 10);
  var SOGLIA_VICINO_CHIUSURA = 60;

  function aggiornaPillola() {
    var ora = new Date();
    var giorno = ora.getDay();
    var minutiOra = ora.getHours() * 60 + ora.getMinutes();

    var classe, testo;

    if (giorno === 0 || giorno === 6 || (giorno === 5 && minutiOra >= ORARIO_CHIUSURA)) {
      classe = 'bg-danger';
      testo = 'Chiusi il fine settimana, ci vediamo Lunedì dalle ore 8';
    } else if (minutiOra < ORARIO_APERTURA || minutiOra >= ORARIO_CHIUSURA) {
      classe = 'bg-danger';
      testo = 'Chiusi, ci vediamo domani dalle ore 8';
    } else if (minutiOra >= PRANZO_INIZIO && minutiOra <= PRANZO_FINE) {
      classe = 'bg-warning text-dark';
      testo = 'Chiusura per pranzo';
    } else if (minutiOra >= ORARIO_CHIUSURA - SOGLIA_VICINO_CHIUSURA) {
      classe = 'badge-orario-arancione';
      testo = 'Aperti ma vicini alla chiusura';
    } else {
      classe = 'bg-success';
      testo = 'Siamo aperti';
    }

    pillola.className = 'badge rounded-pill px-3 py-2 fs-6 pillola-orari ' + classe;
    pillola.textContent = testo;
  }

  aggiornaPillola();
  setInterval(aggiornaPillola, 60000);
})();
