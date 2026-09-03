// Campo "Note aggiuntive": stesso pattern gia' usato dal campo "Contenuto"
// in contatti.html (vedi MessaggioForm) - parte basso (rows=1, vedi
// Preventivo/forms.py) e cresce da solo mentre si scrive, invece di avere
// un'altezza fissa grande "per sicurezza" indipendentemente da quanto
// testo viene scritto
(function () {
  var textarea = document.getElementById('id_messaggio');
  if (!textarea) return;
  function adattaAltezza() {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
  textarea.addEventListener('input', adattaAltezza);
  adattaAltezza();
})();
