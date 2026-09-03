var mymap = L.map('map', { scrollWheelZoom: true }).setView([43.528066, 11.562978], 17);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: ['a', 'b', 'c']
}).addTo(mymap);
// Stesso URL di indicazioni stradali gia' usato nel link del footer,
// per coerenza: cliccando sul marker si apre Google Maps in un'altra scheda
L.marker([43.528066, 11.562978]).addTo(mymap)
  .on('click', function () {
    window.open('https://www.google.com/maps/dir/?api=1&destination=43.528066,11.562978', '_blank', 'noopener');
  });

// Da telefono, un dito solo deve scorrere la pagina invece di
// spostare la mappa - il CSS "touch-action: pan-y" (vedi
// contatti.css, regola "#map") dovrebbe bastare da solo, ma
// nella pratica su alcuni Chrome Android non e' sufficiente
// (Leaflet intercetta comunque il gesto). Soluzione diretta:
// il trascinamento resta disattivato di default, e si attiva
// solo quando si rilevano 2 o piu' dita sullo schermo - con
// un dito solo Leaflet non ascolta proprio il movimento,
// quindi lo scroll nativo della pagina passa attraverso
// senza ostacoli. Col dito solo si mostra anche un banner
// ("usa due dita"), cosi' chi prova davvero a spostare la
// mappa capisce perche' non si muove, invece di sembrare
// rotta.
// Il vincolo delle 2 dita vale solo da telefono (sotto i
// 576px, stesso breakpoint della tabella orari compatta):
// da tablet/desktop con schermo touch il trascinamento con
// un dito solo deve funzionare normalmente, dato che non c'e'
// uno scroll verticale della pagina con cui rischia di
// confliggere allo stesso modo
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

// Zoom da desktop col trackpad: il pizzico a due dita sul
// trackpad (o Ctrl+rotellina) il browser lo traduce in un
// evento "wheel" con ctrlKey:true, mentre lo scroll normale
// a due dita e' un "wheel" con ctrlKey:false - stesso
// meccanismo usato da Google Maps ecc. Si intercetta
// l'evento in fase di "capture" (prima che arrivi al
// listener interno di Leaflet, gia' registrato sopra da
// "scrollWheelZoom:true") e si blocca con stopPropagation()
// quando non e' un pizzico/Ctrl: cosi' Leaflet non lo vede
// e non fa "preventDefault", lasciando scorrere la pagina
// normalmente invece di restare "intrappolati" nello zoom
// della mappa
mymap.getContainer().addEventListener('wheel', function (e) {
  if (!e.ctrlKey) {
    e.stopPropagation();
  }
}, { capture: true });
