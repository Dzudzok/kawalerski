/* =========================================================================
   Muzyka w tle (assets/bg.mp3) — bez reklam, działa też na telefonie.
   Przeglądarki blokują autoodtwarzanie z dźwiękiem, więc próbujemy zagrać,
   a jeśli się nie uda — start następuje przy PIERWSZYM kliknięciu/tapnięciu.
   Przycisk #soundToggle: 🎵 gra / 🔇 cisza.
   ========================================================================= */
(function () {
  "use strict";
  var a = document.getElementById("bgAudio");
  var btn = document.getElementById("soundToggle");
  if (!a) return;

  a.volume = 1.0; // bez ściszania
  var playing = false;

  function icon() { if (btn) btn.textContent = playing ? "🎵" : "🔇"; }

  function play() {
    var p = a.play();
    if (p && p.then) {
      p.then(function () { playing = true; icon(); })
       .catch(function () { playing = false; icon(); });
    } else { playing = true; icon(); }
  }
  function pause() { a.pause(); playing = false; icon(); }

  // Spróbuj od razu (zwykle zablokowane) ...
  play();

  // ... a na pewno przy pierwszym geście użytkownika
  function firstGesture() {
    if (!playing) play();
    document.removeEventListener("click", firstGesture, true);
    document.removeEventListener("touchstart", firstGesture, true);
  }
  document.addEventListener("click", firstGesture, true);
  document.addEventListener("touchstart", firstGesture, true);

  if (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      playing ? pause() : play();
    });
  }
  a.addEventListener("error", function () { if (btn) btn.hidden = true; });
  icon();
})();
