// Campo "Note aggiuntive": parte basso (rows=1) e cresce da solo mentre si scrive
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
