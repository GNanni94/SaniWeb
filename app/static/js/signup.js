// Compilando "Azienda" si nascondono i campi Nome/Cognome e il loro
// contenuto viene sostituito dal testo di "Azienda". Svuotando "Azienda"
// i valori di Nome/Cognome precedenti vengono ripristinati.
(function () {
  var campoAzienda = document.getElementById('id_azienda');
  var rigaAzienda = document.getElementById('riga-azienda');
  var rigaNomeCognome = document.getElementById('riga-nome-cognome');
  var campoNome = document.getElementById('id_first_name');
  var campoCognome = document.getElementById('id_cognome_ragione_sociale');
  var avvisoNomeCognome = document.getElementById('avviso-nome-cognome');
  if (!campoAzienda || !rigaAzienda || !rigaNomeCognome || !campoNome || !campoCognome) return;

  // toggle:false: crea le istanze senza avviare subito un'animazione
  var collapseNomeCognome = new bootstrap.Collapse(rigaNomeCognome, { toggle: false });
  var collapseAzienda = new bootstrap.Collapse(rigaAzienda, { toggle: false });

  var nomeSalvato = null;
  var cognomeSalvato = null;
  var aziendaSalvato = null;
  // true solo quando l'animazione di chiusura e' completamente finita
  var rigaNascosta = false;

  function nascondiAvviso() {
    if (avvisoNomeCognome) avvisoNomeCognome.classList.add('d-none');
  }

  // Imposta "required" su Nome/Cognome solo quando non e' stata scelta
  // l'opzione azienda
  function aggiornaRequired(azienda) {
    campoNome.required = !azienda;
    campoCognome.required = !azienda;
  }

  rigaNomeCognome.addEventListener('hidden.bs.collapse', function () {
    rigaNascosta = true;
    campoCognome.value = campoAzienda.value;
  });
  rigaNomeCognome.addEventListener('show.bs.collapse', function () {
    rigaNascosta = false;
  });

  campoAzienda.addEventListener('input', function () {
    var valore = campoAzienda.value;
    var azienda = valore.trim() !== '';
    aggiornaRequired(azienda);
    nascondiAvviso();

    if (azienda) {
      if (nomeSalvato === null) {
        nomeSalvato = campoNome.value;
        cognomeSalvato = campoCognome.value;
        campoNome.value = '';
        campoCognome.value = '';
        collapseNomeCognome.hide();
      } else if (rigaNascosta) {
        campoCognome.value = valore;
      }
    } else {
      collapseNomeCognome.show();
      campoNome.value = nomeSalvato || '';
      campoCognome.value = cognomeSalvato || '';
      nomeSalvato = null;
      cognomeSalvato = null;
    }
  });

  // Scrivendo in Nome o Cognome nasconde "Azienda", svuotandola e salvando
  // il suo valore per ripristinarlo se si torna a svuotare Nome e Cognome
  function alCambioNomeCognome() {
    var pieno = campoNome.value.trim() !== '' || campoCognome.value.trim() !== '';

    if (pieno) {
      if (aziendaSalvato === null) {
        aziendaSalvato = campoAzienda.value;
        campoAzienda.value = '';
        collapseAzienda.hide();
      }
    } else if (aziendaSalvato !== null) {
      collapseAzienda.show();
      campoAzienda.value = aziendaSalvato;
      aziendaSalvato = null;
    }
  }

  campoNome.addEventListener('input', alCambioNomeCognome);
  campoCognome.addEventListener('input', alCambioNomeCognome);

  // Mostra un avviso Bootstrap quando il campo risulta invalido,
  // sopprimendo solo il tooltip nativo del browser
  [campoNome, campoCognome].forEach(function (campo) {
    campo.addEventListener('invalid', function (e) {
      e.preventDefault();
      if (avvisoNomeCognome) avvisoNomeCognome.classList.remove('d-none');
    });
    campo.addEventListener('input', nascondiAvviso);
  });
})();

// Freccia "torna indietro" nell'intestazione: riporta all'ultima pagina visitata
document.getElementById('btnTornaIndietroRegistrazione').addEventListener('click', function () {
  window.history.back();
});

// Icona di validita' + blocco submit se l'email non e' in un formato valido
installaValidazioneEmail('id_email');

// Telefono: solo indicazione visiva, non blocca il submit
var TELEFONO_REGEX = /^\+?\d{8,15}$/;
installaIconaValidita('id_telefono', function (valore) {
  return TELEFONO_REGEX.test(valore);
});

// Codice fiscale / partita IVA: solo indicazione visiva, non blocca il
// submit - controlla solo il formato (11 cifre per la partita IVA, 16
// caratteri per il codice fiscale), non il carattere di controllo
var CF_PIVA_REGEX = /^(\d{11}|[A-Za-z]{6}\d{2}[A-Za-z]\d{2}[A-Za-z]\d{3}[A-Za-z])$/;
installaIconaValidita('id_codiceFiscale_PartitaIVA', function (valore) {
  return CF_PIVA_REGEX.test(valore);
});

// Regole password (lunghezza minima, non solo lettere/numeri, maiuscola,
// carattere speciale), riusate sia per l'icona di validita' che per la
// checklist sotto il campo
var REGOLE_PASSWORD = {
  lunghezza: function (v) { return v.length >= 8; },
  alfanumerico: function (v) { return !/^[A-Za-z]+$/.test(v) && !/^\d+$/.test(v); },
  maiuscola: function (v) { return /[A-Z]/.test(v); },
  speciale: function (v) { return /[^A-Za-z0-9]/.test(v); },
};

var MESSAGGIO_PASSWORD = 'La password deve avere almeno 8 caratteri, una maiuscola e un carattere speciale, e non essere solo lettere o solo numeri.';

installaIconaValidita('id_password1', function (valore) {
  return Object.keys(REGOLE_PASSWORD).every(function (chiave) {
    return REGOLE_PASSWORD[chiave](valore);
  });
}, {
  blocca: true,
  messaggio: MESSAGGIO_PASSWORD,
});

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

installaChecklistPassword('id_password1', 'requisiti-password1');

// Conferma password: verifica solo che coincida con il campo "Password",
// nascosta finche' non sono stati scritti entrambi i valori. Solo
// indicazione visiva, non blocca il submit
function installaIconaCorrispondenza(idCampoOrigine, idCampoConferma) {
  var origine = document.getElementById(idCampoOrigine);
  var conferma = document.getElementById(idCampoConferma);
  if (!origine || !conferma) return;
  var icona = creaIconaCampo(conferma);

  function aggiorna() {
    icona.classList.remove('bi-check-circle-fill', 'bi-x-circle-fill', 'text-success', 'text-danger');
    if (!origine.value || !conferma.value) {
      icona.classList.add('d-none');
      return;
    }
    icona.classList.remove('d-none');
    if (origine.value === conferma.value) {
      icona.classList.add('bi-check-circle-fill', 'text-success');
    } else {
      icona.classList.add('bi-x-circle-fill', 'text-danger');
    }
  }

  function nascondi() {
    icona.classList.add('d-none');
  }

  origine.addEventListener('blur', aggiorna);
  conferma.addEventListener('blur', aggiorna);
  origine.addEventListener('input', nascondi);
  conferma.addEventListener('input', nascondi);
}

installaIconaCorrispondenza('id_password1', 'id_password2');

// Tasto "occhio" per mostrare/nascondere la password in chiaro, spostando
// l'icona di validita' per fare posto al pulsante
function installaOcchioPassword(idCampo) {
  var input = document.getElementById(idCampo);
  if (!input) return;
  var wrapper = input.parentNode;
  var iconaValidita = input._iconaValidita;

  input.style.paddingRight = '4.5rem';
  if (iconaValidita) {
    // setProperty con "important" per sovrascrivere il margin-right impostato da Bootstrap
    iconaValidita.style.setProperty('margin-right', '2.5rem', 'important');
  }

  var bottone = document.createElement('button');
  bottone.type = 'button';
  bottone.className = 'btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-3';
  // Colore uguale a quello della navbar (var(--color-primary))
  bottone.style.color = 'var(--color-primary)';
  bottone.setAttribute('aria-label', 'Mostra/nascondi password');
  bottone.innerHTML = '<i class="bi bi-eye"></i>';
  wrapper.appendChild(bottone);

  bottone.addEventListener('click', function () {
    var mostrata = input.type === 'text';
    input.type = mostrata ? 'password' : 'text';
    bottone.querySelector('i').className = mostrata ? 'bi bi-eye' : 'bi bi-eye-slash';
    input.focus();
  });
}

installaOcchioPassword('id_password1');
installaOcchioPassword('id_password2');

// Nasconde l'errore del server su "Conferma password" anche scrivendo in "Password"
(function () {
  var pw1 = document.getElementById('id_password1');
  var pw2 = document.getElementById('id_password2');
  if (pw1 && pw2 && pw2._nascondiErroreServer) {
    pw1.addEventListener('input', pw2._nascondiErroreServer, { once: true });
  }
})();
