/* =========================================================================
   Tło strony: film z YouTube (IFrame API) z dźwiękiem.
   Przeglądarki blokują autoplay z dźwiękiem -> startujemy wyciszeni,
   a przy PIERWSZYM kliknięciu/tapnięciu włączamy dźwięk na 40%.
   Przycisk #soundToggle pozwala ręcznie wyciszyć/włączyć.
   ========================================================================= */
(function () {
  "use strict";
  var VID = "JCSrvjf2pn4";
  var START_VOLUME = 40;
  var player = null;
  var soundOn = false;
  var ready = false;

  // Wczytaj YouTube IFrame API
  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("bgVideo", {
      videoId: VID,
      playerVars: {
        autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: VID,
        playsinline: 1, modestbranding: 1, rel: 0, fs: 0, disablekb: 1,
        iv_load_policy: 3, start: 0,
      },
      events: {
        onReady: function (e) {
          ready = true;
          try { e.target.setVolume(START_VOLUME); } catch (_) {}
          e.target.playVideo();
          updateIcon();
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.ENDED) { e.target.seekTo(0); e.target.playVideo(); }
        },
      },
    });
  };

  function updateIcon() {
    var b = document.getElementById("soundToggle");
    if (b) b.textContent = soundOn ? "🔊" : "🔇";
  }
  function enable() {
    if (!ready || !player) return;
    try { player.unMute(); player.setVolume(START_VOLUME); } catch (_) {}
    soundOn = true; updateIcon();
  }
  function disable() {
    if (!ready || !player) return;
    try { player.mute(); } catch (_) {}
    soundOn = false; updateIcon();
  }

  // Pierwszy gest użytkownika -> włącz dźwięk na 40%
  function firstGesture() {
    enable();
    document.removeEventListener("click", firstGesture, true);
    document.removeEventListener("touchstart", firstGesture, true);
  }
  document.addEventListener("click", firstGesture, true);
  document.addEventListener("touchstart", firstGesture, true);

  // Ręczny przełącznik
  function wireToggle() {
    var b = document.getElementById("soundToggle");
    if (!b) return;
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      soundOn ? disable() : enable();
    });
    updateIcon();
  }
  if (document.readyState !== "loading") wireToggle();
  else document.addEventListener("DOMContentLoaded", wireToggle);
})();
