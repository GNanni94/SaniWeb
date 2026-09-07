const _keyValue = document.cookie.match('(^|;) ?cookiebanner=([^;]*)(;|$)');
const cookiebannerCookie = _keyValue ? decodeURIComponent(_keyValue[2]) : null;
const cookiebannerModal = document.getElementById("cookiebannerModal");

document.addEventListener("DOMContentLoaded", function () {
  if (!cookiebannerCookie) cookiebannerModal.classList.remove('hidden');
});

// Il flag "listenersAttached" fa si' che i listener di click vengano
// collegati una sola volta, anche se l'IntersectionObserver scatta piu' volte
let listenersAttached = false;

new IntersectionObserver(([e]) => {
  if (cookiebannerCookie) {
    try {
      cookiebannerCookie.split(',').forEach((sec) =>
        document.querySelector(`input[name="${sec}"]`).checked = true
      )
    } catch {
      console.warn("having trouble parsing the cookiebannerCookie or settings the checkboxes")
    }
  }

  if (listenersAttached) return;
  listenersAttached = true;

  document.querySelectorAll("a[data-toggle='cookiebannerCollapse']").forEach((a) => {
    a.addEventListener("click", () =>
      document.querySelector(a.hash).classList.toggle('show')
    )
  })

  document.querySelectorAll("input.cookiebannerSubmit").forEach((inp) => {
    inp.addEventListener("click", () => {
      let enable_cookies;
      if (inp.name === 'enable_all') {
        enable_cookies = cookiegroups.map((x) => x.id);
      } else {
        let checked_cookiegroups = Array.from(document.querySelector("#cookiebannerForm"))
          .filter((x) => x.checked).map((x) => x.name);
        enable_cookies = cookiegroups
          .filter((x) => {
            return checked_cookiegroups.includes(x.id) ? x : !x.optional;
          })
          .map((x) => x.id);
      }
      const max_age = (365 * 24 * 60 * 60);
      const secure = window.location.protocol === 'https:' ? "secure" : "";
      document.cookie = `cookiebanner=${encodeURIComponent(enable_cookies)}; path=/; max-age=${max_age}; ${secure}`;
      location.reload();
    })
  })
}).observe(cookiebannerModal);
