/* =========================================================================
   Tło strony: własny film (assets/bg.mp4) — bez reklam, działa też na telefonie.
   Autoplay z dźwiękiem jest blokowany przez przeglądarki, więc start jest
   wyciszony, a przy PIERWSZYM kliknięciu/tapnięciu włączamy dźwięk na 40%.
   Przycisk #soundToggle pozwala ręcznie wyciszyć/włączyć.
   Jeśli pliku assets/bg.mp4 nie ma — tło zostaje samym gradientem (czysto).
   ========================================================================= */
(function () {
  "use strict";
  var VOL = 0.4;
  var v = document.getElementById("bgVideo");
  var btn = document.getElementById("soundToggle");
  if (!v) return;

  var soundOn = false;
  var hasMedia = false;

  function icon() { if (btn) btn.textContent = soundOn ? "🔊" : "🔇"; }

  function tryPlayMuted() {
    v.muted = true;
    v.volume = VOL;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function enable() {
    if (!hasMedia) return;
    v.muted = false;
    v.volume = VOL;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
    soundOn = true; icon();
  }
  function disable() {
    v.muted = true;
    soundOn = false; icon();
  }

  // Plik istnieje i da się odtworzyć -> pokaż przycisk dźwięku
  v.addEventListener("loadeddata", function () {
    hasMedia = true;
    if (btn) btn.hidden = false;
    tryPlayMuted();
    icon();
  });
  // Brak pliku / błąd -> ukryj wideo i przycisk, zostaje gradient
  v.addEventListener("error", function () {
    v.style.display = "none";
    if (btn) btn.hidden = true;
  });
  // gdyby <source> nie miał pliku, 'error' leci na <source>; sprawdźmy też po chwili
  setTimeout(function () {
    if (!hasMedia && (v.networkState === 3 || v.readyState === 0)) {
      v.style.display = "none";
      if (btn) btn.hidden = true;
    }
  }, 2500);

  // Pierwszy gest użytkownika -> dźwięk 40%
  function firstGesture() {
    enable();
    document.removeEventListener("click", firstGesture, true);
    document.removeEventListener("touchstart", firstGesture, true);
  }
  document.addEventListener("click", firstGesture, true);
  document.addEventListener("touchstart", firstGesture, true);

  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      soundOn ? disable() : enable();
    });
  }

  tryPlayMuted();
})();
