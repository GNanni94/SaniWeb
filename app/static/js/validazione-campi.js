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
