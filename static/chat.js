/* ── CHATBOT DA — Assistant officiel YARO ──────────────── */
(function () {
  let _open     = false;
  let _loading  = false;
  let _history  = [];
  let _welcomed = false;
  let _ready    = false;
  let _ttsOn    = false;
  let _ttsVoice = null;

  // ── TTS — Web Speech API ────────────────────────────────
  // Noms de voix féminines françaises connus sur iOS/macOS/Android/Windows
  const FEMALE_FR_NAMES = [
    "marie","amélie","amelie","elsa","julie","léa","lea","clara","sophie",
    "audrey","camille","alice","isabelle","zoé","zoe","céline","celine",
    "virginie","pauline","lucie","thomas" // Thomas est parfois la seule voix fr-FR sur iOS
  ];

  function initVoice() {
    if (!window.speechSynthesis) return;
    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      const frVoices = voices.filter(v => v.lang.startsWith("fr"));
      if (!frVoices.length) { _ttsVoice = voices[0] || null; return; }

      // 1. Chercher une voix féminine française locale par nom
      _ttsVoice = frVoices.find(v =>
        FEMALE_FR_NAMES.some(n => v.name.toLowerCase().includes(n)) && v.localService
      )
      // 2. Chercher une voix féminine française (non locale) par nom
      || frVoices.find(v =>
        FEMALE_FR_NAMES.some(n => v.name.toLowerCase().includes(n))
      )
      // 3. Première voix française locale (qualité supérieure)
      || frVoices.find(v => v.localService)
      // 4. Première voix française
      || frVoices[0]
      || voices[0] || null;
    }
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (!_ttsOn || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[👋🎯✅❌⚠️📋✉️📰📍📷]/gu, "").replace(/•/g, "").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang  = "fr-FR";
    utt.rate  = 0.88;   // Plus lent = plus naturel, moins robotique
    utt.pitch = 1.12;   // Légèrement plus haut = voix féminine chaleureuse
    utt.volume = 1;
    if (_ttsVoice) utt.voice = _ttsVoice;
    const btn = document.getElementById("chatTtsBtn");
    utt.onstart = () => { if (btn) btn.classList.add("tts-speaking"); };
    utt.onend   = () => { if (btn) btn.classList.remove("tts-speaking"); };
    utt.onerror = () => { if (btn) btn.classList.remove("tts-speaking"); };
    window.speechSynthesis.speak(utt);
  }

  function toggleTTS() {
    if (!window.speechSynthesis) return;
    _ttsOn = !_ttsOn;
    const btn = document.getElementById("chatTtsBtn");
    if (!btn) return;
    if (_ttsOn) {
      btn.classList.add("tts-on");
      btn.title = "Désactiver la voix";
      speak("Voix activée. Je suis DA, l'assistant virtuel de la Maquette V2.");
    } else {
      window.speechSynthesis.cancel();
      btn.classList.remove("tts-on", "tts-speaking");
      btn.title = "Activer la voix";
    }
  }

  function toggleChat() {
    _open = !_open;
    const bubble = document.getElementById("chatBubble");
    if (bubble) bubble.classList.remove("visible");
    const ring = document.getElementById("chatFabRing");
    if (ring) ring.style.display = "none";
    const win   = document.getElementById("chatWindow");
    const fab   = document.getElementById("chatFab");
    const badge = document.getElementById("chatFabBadge");
    if (win) { win.classList.toggle("open", _open); win.setAttribute("aria-hidden", !_open); }
    if (fab) fab.classList.toggle("open", _open);
    if (_open) {
      if (badge) badge.style.display = "none";
      initChatReady();
      if (window.innerWidth > 600) setTimeout(() => { const i = document.getElementById("chatInput"); if(i) i.focus(); }, 300);
      scrollMessages();
    } else {
      if (document.activeElement) document.activeElement.blur();
    }
  }

  function scrollMessages() {
    const b = document.getElementById("chatMessages");
    if (b) b.scrollTop = b.scrollHeight;
  }

  function addTimestamp() {
    const box = document.getElementById("chatMessages");
    if (!box) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2,"0");
    const m = String(now.getMinutes()).padStart(2,"0");
    const ts = document.createElement("div");
    ts.className = "chat-timestamp";
    ts.textContent = h + ":" + m;
    box.appendChild(ts);
  }

  function addSuggestions(chips) {
    const box = document.getElementById("chatMessages");
    if (!box) return;
    const wrap = document.createElement("div");
    wrap.className = "chat-suggestions";
    wrap.id = "chatSuggestions";
    chips.forEach(label => {
      const btn = document.createElement("button");
      btn.className = "chat-suggestion-chip";
      btn.textContent = label;
      btn.onclick = () => {
        const suggestions = document.getElementById("chatSuggestions");
        if (suggestions) suggestions.remove();
        const inp = document.getElementById("chatInput");
        if (inp) inp.value = label;
        sendChat();
      };
      wrap.appendChild(btn);
    });
    box.appendChild(wrap);
    scrollMessages();
  }

  function addMessage(role, text) {
    const box = document.getElementById("chatMessages");
    if (!box) return;
    const div = document.createElement("div");
    div.className = "chat-msg " + (role === "user" ? "chat-msg-user" : "chat-msg-bot");
    if (role === "bot") {
      const avatar = document.createElement("div");
      avatar.className = "chat-bot-avatar";
      avatar.textContent = "DA";
      div.appendChild(avatar);
    }
    const bub = document.createElement("div");
    bub.className = "msg-bubble";
    bub.textContent = text;
    div.appendChild(bub);
    box.appendChild(div);
    scrollMessages();
    if (role === "bot") speak(text);
  }

  function showTyping() {
    const box = document.getElementById("chatMessages");
    if (!box) return null;
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg-bot chat-typing";
    div.innerHTML = '<div class="msg-bubble"><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span></div>';
    box.appendChild(div);
    scrollMessages();
    return div;
  }

  function normalizeQuestion(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function localReply(text) {
    const q = normalizeQuestion(text);
    const outOfScope = "Je ne peux pas vous aider sur ce point depuis cette maquette. Pour une demande précise, rapprochez-vous de l'equipe via le formulaire de contact.";
    if (!q) return "Je vous écoute. Vous pouvez poser une question sur le programme, les actualités, une demande d'audience, le suivi de dossier ou le contact.";
    if (/\b(bonjour|salut|coucou|hello|bonsoir|comment ca va|comment vas tu|ca va)\b/.test(q)) {
      return "Bonjour, ça va merci, et vous ? Je peux vous aider à trouver le programme, les actualités, le formulaire d'audience ou le contact.";
    }
    if (/\b(merci|super|ok|d accord|parfait)\b/.test(q)) {
      return "Avec plaisir. Je reste disponible si vous voulez accéder au programme, aux vidéos, aux actualités, au contact ou au suivi d'une demande.";
    }
    if (/\b(qui es tu|tu es qui|assistant|da|chatbot|bot)\b/.test(q)) {
      return "Je suis DA, l'assistant virtuel de cette maquette. Je réponds aux questions utiles sur Romi Oyo, le programme, les actualités, les vidéos, les demandes d'audience et le contact.";
    }
    if (/\b(romi|oyo|depute|pct|ouenze|troisieme circonscription)\b/.test(q)) {
      return "Romi Oyo est présenté ici comme député de la troisième circonscription de Ouenzé. La maquette met en avant son parcours, ses actions de proximité, son engagement social et le lien avec les habitants.";
    }
    if (/\b(fondation|harris|hof|orphelin|entraide|partage|amour)\b/.test(q)) {
      return "La Harris Oyo Foundation est présentée dans la galerie et les actualités autour de l'entraide, du partage, de la jeunesse, des familles vulnérables et des actions sociales.";
    }
    if (/\b(audience|rendez vous|rdv|demande|reservation|rencontrer|dossier|suivi|numero)\b/.test(q)) {
      return "Pour une demande d'audience, utilisez le formulaire Audience. Après l'envoi, un numéro de suivi est généré afin de retrouver l'etat du dossier depuis la zone de suivi.";
    }
    if (/\b(programme|projet|engagement|priorite|quartier|ouenze|jeunesse|social|action)\b/.test(q)) {
      return "Le programme met en avant la proximité, la jeunesse, l'emploi local, l'accompagnement social, les quartiers 56 et 57 et le suivi des demandes des habitants.";
    }
    if (/\b(actualite|article|source|presse|adiac|vox|courrier|allafrica|journal)\b/.test(q)) {
      return "La rubrique Actualités regroupe des articles sourcés et datés. Elle sert à montrer les actions publiques, les prises de parole et les initiatives associées au projet.";
    }
    if (/\b(photo|image|galerie|video|youtube|mike tyson|baseron)\b/.test(q)) {
      return "La galerie et la rubrique vidéo présentent les contenus visuels de la maquette. Les raccourcis permettent d'y accéder rapidement sans rallonger le fil principal.";
    }
    if (/\b(instagram|facebook|twitter|reseau|reseaux|x.com|x )\b/.test(q)) {
      return "Les liens Instagram, Facebook et X de Romi Oyo sont disponibles dans la section Contact et dans le pied de page du site.";
    }
    if (/\b(contact|telephone|mail|email|adresse|whatsapp|equipe)\b/.test(q)) {
      return "Pour contacter l'equipe, allez dans la section Contact. Vous pouvez envoyer un message, une demande ou une information utile au suivi.";
    }
    if (/\b(admin|crm|tableau|kpi|statistique|gestion|connexion)\b/.test(q)) {
      return "L'espace admin sert à suivre les demandes, gérer les contenus, consulter les contacts et piloter les indicateurs de la maquette.";
    }
    if (/\b(insulte|nul|merde|con|chiant|fais chier)\b/.test(q)) {
      return "Je comprends. Je reste disponible pour vous orienter clairement sur le site : audience, programme, actualités, galerie, suivi ou contact.";
    }
    return outOfScope;
  }

  function isBasicLocal(text) {
    const q = normalizeQuestion(text);
    return /\b(bonjour|salut|coucou|hello|bonsoir|comment ca va|comment vas tu|ca va|merci|super|ok|d accord|parfait|qui es tu|tu es qui|assistant|da|chatbot|bot|romi|oyo|depute|pct|ouenze|fondation|harris|hof|audience|rendez vous|rdv|demande|programme|projet|actualite|article|photo|image|galerie|video|youtube|contact|telephone|mail|email|instagram|facebook|twitter|reseau|reseaux|admin|crm)\b/.test(q);
  }

  function initChatReady() {
    if (_ready) return;
    _ready = true;
    _welcomed = true;
    addTimestamp();
    addMessage("bot", "Bonjour. Je suis DA, l'assistant virtuel de la Maquette V2. Je suis prêt à vous orienter sur Romi Oyo, le programme, les vidéos, les actualités, les demandes d'audience et le contact.");
    addSuggestions([
      "Faire une demande d'audience",
      "Voir les vidéos",
      "Voir le programme",
      "Contacter l'équipe"
    ]);
  }

  async function sendChat() {
    if (_loading) return;
    const inp = document.getElementById("chatInput");
    const btn = document.getElementById("chatSend");
    const text = inp ? inp.value.trim() : "";
    if (!text) return;
    inp.value = "";
    addTimestamp();
    addMessage("user", text);
    _history.push({ role: "user", content: text });
    _loading = true;
    if (btn) btn.disabled = true;
    const typing = showTyping();
    if (isBasicLocal(text)) {
      setTimeout(() => {
        if (typing) typing.remove();
        const reply = localReply(text);
        addMessage("bot", reply);
        _history.push({ role: "assistant", content: reply });
        if (_history.length > 20) _history = _history.slice(-20);
        _loading = false;
        if (btn) btn.disabled = false;
        if (inp) inp.focus();
      }, 320);
      return;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: _history.slice(-6) }), signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (typing) typing.remove();
      const reply = data.reply || localReply(text);
      addMessage("bot", reply);
      _history.push({ role: "assistant", content: reply });
      if (_history.length > 20) _history = _history.slice(-20);
      if (!_open) { const b = document.getElementById("chatFabBadge"); if(b) b.style.display="flex"; }
    } catch(e) {
      if (typing) typing.remove();
      addMessage("bot", e.name === "AbortError" ? "La réponse prend trop de temps. Voici une orientation rapide : " + localReply(text) : localReply(text));
    } finally {
      _loading = false;
      if (btn) btn.disabled = false;
      if (inp) inp.focus();
    }
  }

  // ── Bouton déplaçable ───────────────────────────────────
  (function makeDraggable() {
    const fab = document.getElementById("chatFab");
    if (!fab) return;

    let dragging = false, hasMoved = false;
    let startX, startY, origLeft, origBottom;

    function getPos(e) {
      return e.touches ? {x:e.touches[0].clientX, y:e.touches[0].clientY} : {x:e.clientX, y:e.clientY};
    }

    function onStart(e) {
      e.preventDefault();
      const pos = getPos(e);
      startX = pos.x; startY = pos.y;
      hasMoved = false; dragging = true;
      const rect = fab.getBoundingClientRect();
      origLeft   = rect.left;
      origBottom = window.innerHeight - rect.bottom;
      fab.style.transition = "none";
      fab.style.opacity = ".85";
    }

    function onMove(e) {
      if (!dragging) return;
      const pos = getPos(e);
      const dx = pos.x - startX, dy = pos.y - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
      if (!hasMoved) return;
      e.preventDefault();
      const sz = fab.offsetWidth, mg = 8;
      fab.style.left   = Math.max(mg, Math.min(window.innerWidth  - sz - mg, origLeft   + dx)) + "px";
      fab.style.bottom = Math.max(mg, Math.min(window.innerHeight - sz - mg, origBottom - dy)) + "px";
      fab.style.right  = "auto";
    }

    function onEnd(e) {
      if (!dragging) return;
      dragging = false;
      fab.style.transition = "";
      fab.style.opacity = "";

      if (hasMoved) {
        e.preventDefault(); e.stopPropagation();
        if (navigator.vibrate) navigator.vibrate(30);
        const win = document.getElementById("chatWindow");
        if (win) {
          const r = fab.getBoundingClientRect();
          const wLeft = Math.max(8, Math.min(window.innerWidth - win.offsetWidth - 8, r.left - win.offsetWidth + fab.offsetWidth));
          win.style.bottom = (window.innerHeight - r.top + 8) + "px";
          win.style.left   = wLeft + "px";
          win.style.right  = "auto";
        }
      } else {
        toggleChat();
      }
    }

    fab.removeAttribute("onclick");
    const isTouchDevice = ("ontouchstart" in window);
    if (isTouchDevice) {
      fab.addEventListener("touchstart", onStart, { passive: false });
      window.addEventListener("touchmove",  onMove, { passive: false });
      window.addEventListener("touchend",   onEnd);
    } else {
      fab.addEventListener("mousedown",  onStart);
      window.addEventListener("mousemove",  onMove);
      window.addEventListener("mouseup",    onEnd);
    }
  })();

  // ── Bulle d'accueil — apparaît après 3s, reste visible ──
  (function() {
    function showBubble() {
      const bubble = document.getElementById("chatBubble");
      if (!bubble) return;
      setTimeout(() => bubble.classList.add("visible"), 3000);
    // Disparaît après 45 secondes
    setTimeout(() => { const b = document.getElementById("chatBubble"); if(b) b.classList.remove("visible"); }, 48000);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showBubble);
    } else {
      showBubble();
    }
  })();

  initVoice();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatReady, { once: true });
  } else {
    initChatReady();
  }
  window.toggleChat = toggleChat;
  window.sendChat   = sendChat;
  window.toggleTTS  = toggleTTS;
})();
