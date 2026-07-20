// Icona di validita' sintattica a fine campo (pallino verde con check se
// valido, pallino rosso con croce se non valido), mostrata solo quando si
// esce dal campo ("blur") dopo aver scritto qualcosa - appena si
// ricomincia a modificare il campo l'icona si nasconde di nuovo, finche'
// non si esce nuovamente. Icone Bootstrap Icons + utility di
// posizionamento Bootstrap, gia' caricate nel sito - nessun CSS custom
// necessario.
// "opzioni.blocca" usa anche "setCustomValidity()" per impedire davvero
// l'invio del form finche' il campo non e' valido, stesso meccanismo
// nativo che gia' blocca i campi "required" vuoti - senza, l'icona rossa
// sarebbe solo decorativa. Senza "opzioni.blocca" e' solo un'indicazione
// visiva.
//
// Condiviso tra signup.html e password_reset_form.html (prima duplicato
// identico in entrambi i file). Per usarlo in un'altra pagina: aggiungere
// {% load static %} e
//   <script src="{% static 'js/validazione-campi.js' %}"></script>
// PRIMA dello <script> della pagina che chiama installaIconaValidita()/
// installaValidazioneEmail()

// Contenitore + icona (senza logica di validazione): condiviso sia da
// installaIconaValidita (un campo, verifica sul proprio valore) sia da
// installaIconaCorrispondenza in signup.html (due campi, verifica che coincidano)
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

  // Il wrapper appena creato mette l'input dentro un nuovo div, "rompendo"
  // la fratellanza diretta con il div ".invalid-feedback" di crispy-forms
  // di cui Bootstrap si serve (regola CSS ".is-invalid ~ .invalid-feedback")
  // per mostrare il messaggio di errore restituito dal server: l'input
  // resta "is-invalid" (bordo rosso) ma il testo dell'errore non compare
  // piu'. Lo forziamo visibile a mano, individuandolo tramite
  // "aria-describedby" (che crispy-forms imposta gia' sull'input).
  var feedbackServer = (input.getAttribute('aria-describedby') || '').split(/\s+/)
    .map(function (id) { return id && document.getElementById(id); })
    .filter(function (el) { return el && el.classList.contains('invalid-feedback'); });

  if (input.classList.contains('is-invalid')) {
    feedbackServer.forEach(function (el) { el.style.display = 'block'; });

    // L'errore si riferisce al valore gia' scritto dal server: appena
    // l'utente ricomincia a modificare il campo lo nascondiamo (stesso
    // principio dell'icona sotto, che si nasconde su "input" e riappare
    // solo al prossimo "blur"/submit). Esposta anche su "input._nascondi..."
    // perche' a volte l'errore va nascosto anche da un ALTRO campo (vedi
    // password1/password2 in signup.html)
    var nascondiErroreServer = function () {
      input.classList.remove('is-invalid');
      feedbackServer.forEach(function (el) { el.style.display = 'none'; });
    };
    input.addEventListener('input', nascondiErroreServer, { once: true });
    input._nascondiErroreServer = nascondiErroreServer;
  }

  // Riferimento salvato sull'input stesso, cosi' chi aggiunge in seguito
  // un'altra icona nello stesso wrapper (vedi installaOcchioPassword in
  // signup.html) puo' spostarla senza doverla ricercare nel DOM
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
      // Azzerato prima di ricontrollare: altrimenti checkValidity() sotto
      // risulterebbe sempre false (un customValidity non vuoto blocca la
      // validita' del campo a prescindere da tutto il resto)
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

// Email: il controllo "checkValidity()" nativo del browser su type="email"
// da solo non basta - accetta anche indirizzi senza un vero punto+TLD nel
// dominio (es. "asdasdas@adsas", "test@localhost", pensato apposta per casi
// come indirizzi di rete locale). Qui serve una regex piu' severa, che
// richiede un punto nel dominio seguito da almeno 2 caratteri (stessa
// regex usata lato server in ClienteCreationForm.clean_email, in
// Utente/forms.py)
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Wrapper per il caso piu' comune (usato in signup.html e
// password_reset_form.html): blocca davvero il submit se l'email non ha un
// formato valido
function installaValidazioneEmail(idCampo) {
  installaIconaValidita(idCampo, function (valore, input) {
    return input.checkValidity() && EMAIL_REGEX.test(valore);
  }, { blocca: true, messaggio: 'Inserisci un indirizzo email valido (es. nome@dominio.it).' });
}
