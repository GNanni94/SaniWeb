// Icona di validita' sintattica a fine campo (verde se valido, rossa se
// non valido), mostrata al "blur" dopo aver scritto qualcosa e nascosta
// di nuovo modificando il campo.
// "opzioni.blocca" usa anche setCustomValidity() per impedire l'invio del
// form finche' il campo non e' valido; senza, e' solo indicazione visiva.
//
// Per usarlo in un'altra pagina:
//   {% load static %}
//   <script src="{% static 'js/validazione-campi.js' %}"></script>
// prima dello <script> che chiama installaIconaValidita()/installaValidazioneEmail()

// Crea contenitore + icona (senza logica di validazione), usata sia da
// installaIconaValidita che da installaIconaCorrispondenza in signup.html
function creaIconaCampo(input) {
  var wrapper = document.createElement('div');
  wrapper.className = 'position-relative';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);
  input.classList.add('pe-5');

  var icona = document.createElement('i');
  icona.className = 'bi position-absolute top-50 end-0 translate-middle-y me-3 d-none';
  icona.style.fontSize = '1.25rem';
  icona.setAttribute('aria-hidden', 'true');
  wrapper.appendChild(icona);

  // Mostra a mano il messaggio di errore del server (".invalid-feedback"),
  // individuato tramite "aria-describedby" impostato da crispy-forms
  var feedbackServer = (input.getAttribute('aria-describedby') || '').split(/\s+/)
    .map(function (id) { return id && document.getElementById(id); })
    .filter(function (el) { return el && el.classList.contains('invalid-feedback'); });

  if (input.classList.contains('is-invalid')) {
    feedbackServer.forEach(function (el) { el.style.display = 'block'; });

    // Nasconde l'errore del server quando l'utente ricomincia a modificare
    // il campo, esposta anche su "input._nascondiErroreServer" per essere
    // richiamata da un altro campo
    var nascondiErroreServer = function () {
      input.classList.remove('is-invalid');
      feedbackServer.forEach(function (el) { el.style.display = 'none'; });
    };
    input.addEventListener('input', nascondiErroreServer, { once: true });
    input._nascondiErroreServer = nascondiErroreServer;
  }

  // Riferimento salvato sull'input stesso, per poter spostare l'icona da un'altra funzione
  input._iconaValidita = icona;

  return icona;
}

function installaIconaValidita(idCampo, eValida, opzioni) {
  opzioni = opzioni || {};
  var input = document.getElementById(idCampo);
  if (!input) return;
  var icona = creaIconaCampo(input);

  function aggiornaIcona() {
    icona.classList.remove('bi-check-circle-fill', 'bi-x-circle-fill', 'text-success', 'text-danger');

    if (opzioni.blocca) {
      // Azzera customValidity prima di ricontrollare, altrimenti resterebbe sempre invalido
      input.setCustomValidity('');
    }
    var valore = input.value.trim();
    var valida = valore !== '' && eValida(valore, input);

    if (opzioni.blocca && valore && !valida) {
      input.setCustomValidity(opzioni.messaggio || 'Valore non valido.');
    }

    if (!valore) {
      icona.classList.add('d-none');
      return;
    }
    icona.classList.remove('d-none');
    if (valida) {
      icona.classList.add('bi-check-circle-fill', 'text-success');
    } else {
      icona.classList.add('bi-x-circle-fill', 'text-danger');
    }
  }

  input.addEventListener('blur', aggiornaIcona);
  input.addEventListener('input', function () {
    icona.classList.add('d-none');
  });
}

// Regex per email: richiede un punto nel dominio seguito da almeno 2 caratteri
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Blocca il submit se l'email non ha un formato valido
function installaValidazioneEmail(idCampo) {
  installaIconaValidita(idCampo, function (valore, input) {
    return input.checkValidity() && EMAIL_REGEX.test(valore);
  }, { blocca: true, messaggio: 'Inserisci un indirizzo email valido (es. nome@dominio.it).' });
}

// Regole password (lunghezza minima, non solo lettere/numeri, maiuscola,
// carattere speciale), usate sia per l'icona di validita' che per la
// checklist sotto il campo
var REGOLE_PASSWORD = {
  lunghezza: function (v) { return v.length >= 8; },
  alfanumerico: function (v) { return !/^[A-Za-z]+$/.test(v) && !/^\d+$/.test(v); },
  maiuscola: function (v) { return /[A-Z]/.test(v); },
  speciale: function (v) { return /[^A-Za-z0-9]/.test(v); },
};

var MESSAGGIO_PASSWORD = 'La password deve avere almeno 8 caratteri, una maiuscola e un carattere speciale, e non essere solo lettere o solo numeri.';

// Checklist dettagliata: si aggiorna ad ogni carattere digitato, non solo al "blur"
function installaChecklistPassword(idCampo, idLista) {
  var input = document.getElementById(idCampo);
  var lista = document.getElementById(idLista);
  if (!input || !lista) return;

  function aggiorna() {
    var valore = input.value;
    var valida = true;
    Object.keys(REGOLE_PASSWORD).forEach(function (chiave) {
      var ok = REGOLE_PASSWORD[chiave](valore);
      valida = valida && ok;
      var icona = lista.querySelector('[data-regola="' + chiave + '"] i');
      icona.classList.remove('bi-circle', 'text-muted', 'bi-check-circle-fill', 'text-success', 'bi-x-circle-fill', 'text-danger');
      if (valore === '') {
        icona.classList.add('bi-circle', 'text-muted');
      } else if (ok) {
        icona.classList.add('bi-check-circle-fill', 'text-success');
      } else {
        icona.classList.add('bi-x-circle-fill', 'text-danger');
      }
    });
    input.setCustomValidity(valore && !valida ? MESSAGGIO_PASSWORD : '');
  }

  input.addEventListener('input', aggiorna);
}
