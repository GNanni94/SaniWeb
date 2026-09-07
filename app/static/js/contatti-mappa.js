var mymap = L.map('map', { scrollWheelZoom: true }).setView([43.528066, 11.562978], 17);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: ['a', 'b', 'c']
}).addTo(mymap);
// Cliccando sul marker si apre Google Maps in un'altra scheda
L.marker([43.528066, 11.562978]).addTo(mymap)
  .on('click', function () {
    window.open('https://www.google.com/maps/dir/?api=1&destination=43.528066,11.562978', '_blank', 'noopener');
  });

// Da telefono (sotto i 576px) il trascinamento della mappa resta
// disattivato finche' non si rilevano almeno 2 dita sullo schermo, cosi'
// un dito solo scorre la pagina invece di spostare la mappa; con un dito
// solo si mostra anche un banner ("usa due dita")
var mqTelefono = window.matchMedia('(max-width: 575.98px)');
var hint = document.getElementById('mapHint');
var timeoutHint = null;
if (mqTelefono.matches) {
  mymap.dragging.disable();
}
mymap.getContainer().addEventListener('touchstart', function (e) {
  if (!mqTelefono.matches) return;
  clearTimeout(timeoutHint);
  if (e.touches.length >= 2) {
    mymap.dragging.enable();
    hint.classList.remove('visibile');
  } else {
    mymap.dragging.disable();
    hint.classList.add('visibile');
    timeoutHint = setTimeout(function () {
      hint.classList.remove('visibile');
    }, 1500);
  }
}, { passive: true });
mymap.getContainer().addEventListener('touchend', function (e) {
  if (!mqTelefono.matches) return;
  if (e.touches.length < 2) {
    mymap.dragging.disable();
  }
});

// Blocca l'evento "wheel" prima che arrivi a Leaflet a meno che non sia un
// pizzico a due dita sul trackpad o Ctrl+rotellina (ctrlKey:true), cosi' lo
// scroll normale della pagina non resta intrappolato nello zoom della mappa
mymap.getContainer().addEventListener('wheel', function (e) {
  if (!e.ctrlKey) {
    e.stopPropagation();
  }
}, { capture: true });
