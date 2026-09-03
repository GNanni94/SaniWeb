// Campo "Contenuto": parte basso (2 righe, vedi MessaggioForm) e cresce
// da solo mentre si scrive, invece di avere un'altezza fissa grande
// "per sicurezza" indipendentemente da quanto testo viene scritto
(function () {
  var textarea = document.getElementById('id_contenuto');
  if (!textarea) return;
  function adattaAltezza() {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
  textarea.addEventListener('input', adattaAltezza);
  adattaAltezza();
})();
