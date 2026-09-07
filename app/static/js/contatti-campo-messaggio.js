// Il campo "Contenuto" cresce in altezza automaticamente mentre si scrive
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
