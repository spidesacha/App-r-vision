(function () {
  var D = window.BIOCELL_DATA, Q = window.Quiz, St = window.Store, app = document.getElementById("app"), tabs = document.getElementById("tabs");
  var CH, ALL, BYCH, QBY, S = null, timer = null, view = {}, filtreErr = "";

  function $(s) { return document.querySelector(s); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(x) { return (Math.round(x * 100) / 100).toString().replace(".", ","); }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

  function build() {
    var C = St.custom(); CH = {}; ALL = D.questions.concat(C.questions); BYCH = {}; QBY = {};
    D.chapitres.concat(C.chapitres).forEach(function (c) { CH[c.id] = c; });
    ALL.forEach(function (q) { (BYCH[q.chapitre] = BYCH[q.chapitre] || []).push(q); QBY[q.id] = q; if (!CH[q.chapitre]) CH[q.chapitre] = { id: q.chapitre, titre: q.chapitre, matiere: "Autres cours" }; });
  }
  function ids() { return Object.keys(BYCH).filter(function (k) { return BYCH[k].length; }).sort(function (a, b) { return a < b ? -1 : 1; }); }
  function titre(id) { return CH[id] ? CH[id].titre : id; }
  function stat(list) {
    var v = 0, j = 0;
    list.forEach(function (q) { var r = St.get(q.id); if (r) { v++; if (r.derniere === "juste") j++; } });
    return { total: list.length, vues: v, justes: j };
  }
  function bar(p) { return '<div class="bar"><i style="width:' + Math.round(p * 100) + '%"></i></div>'; }
  function setTab(t) { [].forEach.call(tabs.children, function (b) { b.classList.toggle("on", b.getAttribute("data-go") === t); }); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function go(v, a) { stopTimer(); view[v](a); window.scrollTo(0, 0); }
  function head(l, r, back) {
    return '<div class="r sp">' + (back ? '<button class="t sm" id="back" aria-label="Retour">‹</button>' : '') + '<b>' + l + '</b><span class="m">' + (r || "") + '</span></div>';
  }
  function pill(q) { return '<span class="p">' + (q.type === "QCM" ? "QCM · plusieurs réponses possibles" : "QCS · une seule réponse") + '</span>'; }
  function src(q) { return q.source && q.source.diapo ? '<span class="m">Source : ' + esc(titre(q.source.chapitre || q.chapitre)) + ', diapo ' + q.source.diapo + '</span>' : ""; }

  // ---------- rendu d'une question ----------
  function props(e, sel, corr) {
    var q = e.q, multi = q.type === "QCM", h = "";
    e.ordre.forEach(function (i) {
      var et = corr ? Q.etat(q, sel, i) : "neutre", ck = sel.indexOf(i) > -1;
      h += '<label class="t' + (et !== "neutre" ? " " + et : "") + '" data-i="' + i + '"><input type="' + (multi ? "checkbox" : "radio") + '" name="p" value="' + i + '"' + (ck ? " checked" : "") + (corr ? " disabled" : "") + '><span>' + esc(q.propositions[i]) + '</span>' +
        (et !== "neutre" ? '<span class="tag">' + { juste: "Juste", faux: "Faux", oubliee: "Oubliée" }[et] + '</span>' : "") + '</label>';
    });
    return h;
  }
  function correction(q, pts) {
    return '<div class="c f"><b>' + (pts === 1 ? "Bonne réponse." : pts > 0 ? "Réponse partielle : " + fmt(pts) + " / 1 point." : "Pas tout à fait.") + '</b><span class="m">' + esc(q.explication || "") + '</span>' + src(q) + '</div>';
  }
  function lire() { return [].slice.call(document.querySelectorAll("#props input:checked")).map(function (x) { return +x.value; }); }

  // ---------- séries d'entraînement ----------
  function pratique(list, opt) {
    if (!list.length) { app.innerHTML = '<div class="c">Aucune question disponible pour cette série.</div><button class="b g" id="ret">Retour</button>'; $("#ret").onclick = opt.back; return; }
    S = { mode: "pr", l: list.map(function (q) { return { q: q, ordre: Q.ordre(q) }; }), i: 0, pts: 0, res: [], titre: opt.titre, back: opt.back, sel: [] };
    showQ();
  }
  function showQ() {
    var e = S.l[S.i], q = e.q, n = S.l.length;
    S.sel = [];
    app.innerHTML = head(esc(S.titre) + " · " + (S.i + 1) + "/" + n, "Score " + fmt(S.pts), true) + bar(S.i / n) + pill(q) +
      '<h2 class="e" id="enonce" tabindex="-1">' + esc(q.enonce) + '</h2><div class="f" id="props">' + props(e, [], false) + '</div><div id="fb" aria-live="polite"></div><button class="b" id="val" disabled>Valider</button>';
    $("#enonce").focus();
    $("#back").onclick = function () { if (confirm("Quitter la série en cours ?")) S.back(); };
    $("#props").onchange = function () { S.sel = lire(); $("#val").disabled = !S.sel.length; };
    $("#val").onclick = valider;
  }
  function valider() {
    var e = S.l[S.i], q = e.q, pts = Q.score(q, S.sel);
    S.pts += pts; S.res.push({ q: q, pts: pts }); St.record(q, pts);
    $("#props").innerHTML = props(e, S.sel, true);
    $("#fb").innerHTML = correction(q, pts);
    var last = S.i + 1 >= S.l.length, b = $("#val");
    b.disabled = false; b.textContent = last ? "Voir mon score" : "Question suivante";
    b.onclick = function () { if (last) finSerie(); else { S.i++; showQ(); } };
    b.focus();
  }
  function finSerie() {
    var n = S.l.length, ratees = S.res.filter(function (r) { return r.pts < 1; });
    var h = '<div class="c"><h1>' + fmt(S.pts) + ' / ' + n + '</h1><div class="m">' + pct(S.pts, n) + ' % · ' + ratees.length + ' question(s) à revoir</div></div>';
    if (ratees.length) {
      h += '<h3>À revoir</h3>';
      ratees.forEach(function (r) { h += '<div class="c f"><b>' + esc(r.q.enonce) + '</b><span class="m">' + esc(r.q.explication || "") + '</span>' + src(r.q) + '</div>'; });
    }
    h += (ratees.length ? '<button class="b" id="rt">Refaire ces questions</button>' : "") + '<button class="b g" id="bk">Terminer</button>';
    app.innerHTML = h;
    var back = S.back, titreS = S.titre;
    if (ratees.length) $("#rt").onclick = function () { pratique(ratees.map(function (r) { return r.q; }), { titre: titreS, back: back }); };
    $("#bk").onclick = back;
  }

  // ---------- accueil ----------
  view.accueil = function () {
    setTab("accueil");
    var tot = stat(ALL), nerr = Object.keys(St.erreurs()).filter(function (id) { return QBY[id]; }).length;
    var h = '<div><h1>Révisions L1 SPS</h1><div class="m">' + ALL.length + ' questions · ' + ids().length + ' chapitres</div></div>' +
      '<div class="r"><div class="c" style="flex:1"><h1>' + pct(tot.justes, tot.vues) + ' %</h1><div class="m">Réussite (questions vues)</div></div><div class="c" style="flex:1"><h1>' + St.serie() + (St.serie() > 1 ? " jours" : " jour") + '</h1><div class="m">Série en cours</div></div></div>' +
      '<div class="c f"><b>' + tot.vues + ' / ' + tot.total + ' questions vues</b>' + bar(tot.total ? tot.vues / tot.total : 0) + '</div>';
    var d = St.dernier();
    if (d && BYCH[d]) h += '<button class="b" id="cont">Continuer : ' + esc(titre(d)) + '</button>';
    h += '<div class="q"><button class="t big" data-go="chapitres"><b>Chapitres</b><span class="m">' + ids().length + ' chapitres</span></button><button class="t big" data-go="exam"><b>Examen blanc</b><span class="m">50 questions, minuteur</span></button>' +
      '<button class="t big" data-go="erreurs"><b>Mes erreurs</b><span class="m">' + nerr + ' à revoir</span></button><button class="t big" data-go="ajouter"><b>Ajouter des questions</b><span class="m">Nouveau cours</span></button></div>';
    var faibles = ids().map(function (id) { var s = stat(BYCH[id]); return { id: id, s: s, p: s.vues ? s.justes / s.vues : -1 }; }).sort(function (a, b) { return a.p - b.p; }).slice(0, 3);
    h += '<h3>À travailler en priorité</h3>' + faibles.map(function (f) { return '<button class="t" data-ch="' + f.id + '"><span style="flex:1">' + esc(titre(f.id)) + '</span><span class="m">' + (f.s.vues ? pct(f.s.justes, f.s.vues) + " %" : "pas commencé") + '</span></button>'; }).join("");
    app.innerHTML = h;
    var c = $("#cont"); if (c) c.onclick = function () { go("chapitre", d); };
    lier();
  };
  function lier() {
    [].forEach.call(app.querySelectorAll("[data-go]"), function (b) { b.onclick = function () { go(b.getAttribute("data-go")); }; });
    [].forEach.call(app.querySelectorAll("[data-ch]"), function (b) { b.onclick = function () { go("chapitre", b.getAttribute("data-ch")); }; });
  }

  // ---------- chapitres ----------
  view.chapitres = function () {
    setTab("chapitres");
    var groupes = {}, h = '<h1>Chapitres</h1>';
    ids().forEach(function (id) { var m = CH[id].matiere || "Autres cours"; (groupes[m] = groupes[m] || []).push(id); });
    Object.keys(groupes).forEach(function (m) {
      h += '<h3 class="m" style="margin-top:6px">' + esc(m) + '</h3>';
      groupes[m].forEach(function (id) {
        var s = stat(BYCH[id]);
        h += '<button class="t col" data-ch="' + id + '"><span class="r sp" style="width:100%"><b>' + esc(titre(id)) + '</b><span class="m">' + s.vues + '/' + s.total + '</span></span>' + bar(s.total ? s.vues / s.total : 0) + '<span class="m">' + (s.vues ? "Réussite " + pct(s.justes, s.vues) + " %" : "Pas commencé") + '</span></button>';
      });
    });
    app.innerHTML = h; lier();
  };
  view.chapitre = function (id) {
    setTab("chapitres"); St.setDernier(id);
    var qs = BYCH[id] || [], s = stat(qs), nv = qs.length - s.vues;
    var nr = qs.filter(function (q) { var r = St.get(q.id); return r && r.derniere === "faux"; }).length;
    var nqcs = qs.filter(function (q) { return q.type === "QCS"; }).length;
    app.innerHTML = '<button class="t sm" id="back" aria-label="Retour">‹</button><div><h1>' + esc(titre(id)) + '</h1><div class="m">' + esc(CH[id] ? CH[id].matiere || "" : "") + '</div></div>' +
      '<div class="c f"><div class="r sp"><b>' + s.vues + ' / ' + s.total + ' questions vues</b><span class="p">' + nqcs + ' QCS · ' + (qs.length - nqcs) + ' QCM</span></div>' + bar(s.total ? s.vues / s.total : 0) + '<span class="m">' + (s.vues ? "Réussite " + pct(s.justes, s.vues) + " %" : "Pas encore commencé") + '</span></div>' +
      '<button class="b" id="s10">Série de 10 questions</button><button class="b g" id="snv"' + (nv ? "" : " disabled") + '>Questions non vues (' + nv + ')</button><button class="b g" id="srt"' + (nr ? "" : " disabled") + '>Questions ratées (' + nr + ')</button><button class="b g" id="sall">Tout le chapitre, mélangé</button>';
    var retour = function () { go("chapitre", id); };
    $("#back").onclick = function () { go("chapitres"); };
    $("#s10").onclick = function () { pratique(Q.priorite(qs, St.get, 10), { titre: titre(id), back: retour }); };
    $("#snv").onclick = function () { pratique(Q.shuffle(qs.filter(function (q) { return !St.get(q.id); })), { titre: titre(id), back: retour }); };
    $("#srt").onclick = function () { pratique(Q.shuffle(qs.filter(function (q) { var r = St.get(q.id); return r && r.derniere === "faux"; })), { titre: titre(id), back: retour }); };
    $("#sall").onclick = function () { pratique(Q.shuffle(qs), { titre: titre(id), back: retour }); };
  };

  // ---------- erreurs ----------
  view.erreurs = function () {
    setTab("erreurs");
    var l = Object.keys(St.erreurs()).map(function (id) { return QBY[id]; }).filter(Boolean), par = {};
    l.forEach(function (q) { par[q.chapitre] = (par[q.chapitre] || 0) + 1; });
    var f = filtreErr && par[filtreErr] ? filtreErr : "", sel = f ? l.filter(function (q) { return q.chapitre === f; }) : l;
    var h = '<div><h1>Mes erreurs</h1><div class="m">Une question sort de la liste après 2 bonnes réponses d’affilée.</div></div><div class="c"><h1>' + l.length + '</h1><div class="m">question(s) à revoir</div></div>';
    if (l.length) {
      h += '<div class="chips"><button class="p ch' + (!f ? " on" : "") + '" data-f="">Tous (' + l.length + ')</button>' + Object.keys(par).map(function (id) { return '<button class="p ch' + (f === id ? " on" : "") + '" data-f="' + id + '">' + esc(titre(id)) + ' (' + par[id] + ')</button>'; }).join("") + '</div>';
      h += '<button class="b" id="rev">Réviser ' + Math.min(sel.length, 20) + ' erreur' + (Math.min(sel.length, 20) > 1 ? "s" : "") + '</button>';
      sel.slice(0, 5).forEach(function (q) { h += '<div class="c"><span class="m">' + esc(titre(q.chapitre)) + '</span><div>' + esc(q.enonce) + '</div></div>'; });
    } else h += '<div class="c m">Aucune erreur pour le moment. Les questions ratées apparaîtront ici.</div>';
    app.innerHTML = h;
    [].forEach.call(document.querySelectorAll("[data-f]"), function (b) { b.onclick = function () { filtreErr = b.getAttribute("data-f"); view.erreurs(); }; });
    var r = $("#rev"); if (r) r.onclick = function () { pratique(Q.shuffle(sel).slice(0, 20), { titre: "Erreurs", back: function () { go("erreurs"); } }); };
  };

  // ---------- examen blanc ----------
  view.exam = function () {
    setTab("exam");
    var n = Math.min(50, ALL.length), dur = St.reglages().duree_examen_min || 60, hist = St.examens().slice(-5).reverse();
    app.innerHTML = '<div><h1>Examen blanc</h1><div class="m">' + n + ' questions tirées au hasard dans tous les chapitres, réparties équitablement.</div></div>' +
      '<div class="c f"><span>Durée : ' + dur + ' minutes (réglable dans « Plus »)</span><span>Navigation libre, correction à la fin.</span><span>Note sur 20 et détail par chapitre.</span></div><button class="b" id="go">Commencer l’examen</button>' +
      (hist.length ? '<h3>Derniers examens</h3>' + hist.map(function (e) { return '<div class="c r sp"><span>' + new Date(e.date).toLocaleDateString("fr-FR") + '</span><b>' + fmt(e.note) + ' / 20</b></div>'; }).join("") : "");
    $("#go").onclick = lancerExam;
  };
  function lancerExam() {
    var qs = Q.exam(BYCH, Math.min(50, ALL.length));
    S = { mode: "ex", l: qs.map(function (q) { return { q: q, ordre: Q.ordre(q) }; }), rep: {}, cur: 0, t0: Date.now(), dur: (St.reglages().duree_examen_min || 60) * 60 };
    timer = setInterval(tick, 1000); showEx();
  }
  function reste() { return Math.max(0, S.dur - Math.floor((Date.now() - S.t0) / 1000)); }
  function tick() {
    var r = reste(), el = $("#tm"); if (el) el.textContent = Math.floor(r / 60) + ":" + ("0" + (r % 60)).slice(-2);
    if (r <= 0) { alert("Temps écoulé : l’examen est terminé."); finExam(); }
  }
  function showEx() {
    var e = S.l[S.cur], q = e.q, n = S.l.length, rep = S.rep[S.cur] || [], dots = "";
    for (var i = 0; i < n; i++) dots += '<button class="dot' + (S.rep[i] && S.rep[i].length ? " ok" : "") + (i === S.cur ? " cur" : "") + '" data-n="' + i + '" aria-label="Question ' + (i + 1) + '">' + (i + 1) + '</button>';
    var nb = Object.keys(S.rep).filter(function (k) { return S.rep[k].length; }).length;
    app.innerHTML = '<div class="r sp"><h1 style="font-size:20px">Examen blanc</h1><span class="p" id="tm" style="font-size:15px">…</span></div><div class="m">Question ' + (S.cur + 1) + ' / ' + n + ' · ' + nb + ' réponse(s)</div><div class="dots">' + dots + '</div>' + pill(q) +
      '<h2 class="e" tabindex="-1">' + esc(q.enonce) + '</h2><div class="f" id="props">' + props(e, rep, false) + '</div><div class="m">Aucune correction avant la fin.</div><div class="r"><button class="b g" id="pv" style="flex:1"' + (S.cur ? "" : " disabled") + '>Précédent</button><button class="b" id="nx" style="flex:1"' + (S.cur < n - 1 ? "" : " disabled") + '>Suivant</button></div><button class="t" id="fin" style="justify-content:center;color:var(--rt)">Terminer l’examen</button>';
    tick();
    $("#props").onchange = function () { S.rep[S.cur] = lire(); showEx(); };
    $("#pv").onclick = function () { S.cur--; showEx(); window.scrollTo(0, 0); };
    $("#nx").onclick = function () { S.cur++; showEx(); window.scrollTo(0, 0); };
    $("#fin").onclick = function () { var vides = n - nb; if (confirm(vides ? vides + " question(s) sans réponse. Terminer l’examen ?" : "Terminer l’examen ?")) finExam(); };
    [].forEach.call(document.querySelectorAll(".dot"), function (d) { d.onclick = function () { S.cur = +d.getAttribute("data-n"); showEx(); window.scrollTo(0, 0); }; });
  }
  function finExam() {
    stopTimer();
    var n = S.l.length, tot = 0, par = {};
    S.l.forEach(function (e, i) {
      var pts = Q.score(e.q, S.rep[i] || []); e.pts = pts; tot += pts; St.record(e.q, pts);
      var p = par[e.q.chapitre] || (par[e.q.chapitre] = { pts: 0, total: 0 }); p.pts += pts; p.total++;
    });
    var note = n ? tot / n * 20 : 0;
    St.addExam({ date: new Date().toISOString(), duree_s: Math.min(S.dur, Math.floor((Date.now() - S.t0) / 1000)), note: Math.round(note * 100) / 100, par_chapitre: par });
    S.fin = { note: note, par: par };
    resultat();
  }
  function resultat() {
    var f = S.fin, h = '<div class="c"><h1>' + fmt(f.note) + ' / 20</h1><div class="m">' + S.l.filter(function (e) { return e.pts >= 1; }).length + ' réponses justes sur ' + S.l.length + '</div></div><h3>Détail par chapitre</h3>';
    Object.keys(f.par).forEach(function (id) { var p = f.par[id]; h += '<div class="c f"><div class="r sp"><span>' + esc(titre(id)) + '</span><b>' + fmt(p.pts) + ' / ' + p.total + '</b></div>' + bar(p.total ? p.pts / p.total : 0) + '</div>'; });
    h += '<button class="b" id="cr">Voir la correction</button><button class="b g" id="bk">Terminer</button>';
    app.innerHTML = h; $("#cr").onclick = function () { S.cur = 0; corrEx(); }; $("#bk").onclick = function () { go("exam"); };
  }
  function corrEx() {
    var e = S.l[S.cur], q = e.q, n = S.l.length;
    app.innerHTML = head("Correction · " + (S.cur + 1) + "/" + n, fmt(e.pts) + " / 1", true) + '<span class="m">' + esc(titre(q.chapitre)) + '</span>' + pill(q) + '<h2 class="e">' + esc(q.enonce) + '</h2><div class="f">' + props(e, S.rep[S.cur] || [], true) + '</div>' + correction(q, e.pts) +
      '<div class="r"><button class="b g" id="pv" style="flex:1"' + (S.cur ? "" : " disabled") + '>Précédent</button><button class="b" id="nx" style="flex:1"' + (S.cur < n - 1 ? "" : " disabled") + '>Suivant</button></div>';
    $("#back").onclick = resultat; $("#pv").onclick = function () { S.cur--; corrEx(); window.scrollTo(0, 0); }; $("#nx").onclick = function () { S.cur++; corrEx(); window.scrollTo(0, 0); };
  }

  // ---------- ajouter des questions ----------
  function normaliser(x, defChap, i) {
    if (!x || typeof x.enonce !== "string" || !x.enonce.trim()) return { err: "énoncé manquant" };
    if (!Array.isArray(x.propositions) || x.propositions.length < 2 || x.propositions.length > 8) return { err: "propositions invalides (2 à 8)" };
    var b = x.bonnes;
    if (!Array.isArray(b) || !b.length || b.some(function (k) { return !Number.isInteger(k) || k < 0 || k >= x.propositions.length; }) || b.length >= x.propositions.length) return { err: "bonnes réponses invalides" };
    var chap = x.chapitre || defChap; if (!chap) return { err: "chapitre manquant" };
    return { q: { id: x.id ? String(x.id) : chap + "-a" + Date.now().toString(36) + i, chapitre: chap, type: b.length > 1 ? "QCM" : "QCS", angle: x.angle || "definition", fait: x.fait || "", enonce: x.enonce, propositions: x.propositions.map(String), bonnes: b, explication: x.explication || "", source: x.source || { chapitre: chap, diapo: 0 } } };
  }
  function importer(txt) {
    var o = JSON.parse(txt), liste, chs = [], defChap = null;
    if (Array.isArray(o)) liste = o;
    else if (o && Array.isArray(o.questions)) {
      liste = o.questions;
      if (o.chapitre) { chs.push(o.chapitre); defChap = o.chapitre.id; }
      if (Array.isArray(o.chapitres)) chs = chs.concat(o.chapitres);
    } else throw new Error("Format non reconnu : un tableau de questions ou un objet avec « questions » est attendu.");
    var ok = [], rejets = [], vus = {};
    ALL.forEach(function (q) { vus[q.id] = 1; });
    liste.forEach(function (x, i) {
      var r = normaliser(x, defChap, i);
      if (r.err) rejets.push("Question " + (i + 1) + " : " + r.err);
      else if (vus[r.q.id]) rejets.push("Question " + (i + 1) + " : identifiant déjà présent (" + r.q.id + ")");
      else { vus[r.q.id] = 1; ok.push(r.q); }
    });
    var connus = {}; D.chapitres.concat(St.custom().chapitres).forEach(function (c) { connus[c.id] = c; });
    chs.forEach(function (c) { if (c && c.id) connus[c.id] = connus[c.id] || c; });
    var nouveaux = [], vusCh = {};
    ok.forEach(function (q) {
      if (!vusCh[q.chapitre] && !St.custom().chapitres.some(function (c) { return c.id === q.chapitre; }) && !D.chapitres.some(function (c) { return c.id === q.chapitre; })) {
        vusCh[q.chapitre] = 1; var d = connus[q.chapitre] || {};
        nouveaux.push({ id: q.chapitre, titre: d.titre || q.chapitre, matiere: d.matiere || "Autres cours" });
      }
    });
    if (ok.length) St.addCustom(nouveaux, ok);
    build();
    return { ajoutees: ok.length, rejets: rejets, nouveaux: nouveaux.length };
  }
  view.ajouter = function (msg) {
    setTab("plus");
    var cu = St.custom();
    app.innerHTML = '<button class="t sm" id="back" aria-label="Retour">‹</button><div><h1>Ajouter des questions</h1><div class="m">Pour un nouveau cours ou les chapitres de biologie moléculaire : importe un fichier JSON ou colle son contenu.</div></div>' +
      (msg ? '<div class="c f" aria-live="polite">' + msg + '</div>' : "") +
      '<label class="b g fileb">Choisir un fichier .json<input type="file" id="fi" accept=".json,application/json" hidden></label><textarea id="ta" rows="6" placeholder="Ou colle ici le JSON des questions"></textarea><button class="b" id="im">Importer</button>' +
      '<details class="c"><summary><b>Format attendu</b></summary><pre class="m" style="white-space:pre-wrap">{\n "chapitre": {"id":"bm01","titre":"Acides nucléiques","matiere":"Biologie moléculaire"},\n "questions": [{\n  "enonce": "…",\n  "propositions": ["A","B","C","D"],\n  "bonnes": [1],\n  "explication": "…",\n  "source": {"chapitre":"bm01","diapo":12}\n }]\n}\nUn tableau de questions est aussi accepté (chaque question porte alors « chapitre »). Plusieurs bonnes réponses : QCM.</pre></details>' +
      '<h3>Cours ajoutés</h3>' + (cu.chapitres.length ? cu.chapitres.map(function (c) { return '<div class="c r sp"><span>' + esc(c.titre) + ' · ' + cu.questions.filter(function (q) { return q.chapitre === c.id; }).length + ' questions</span><button class="t sm" data-del="' + esc(c.id) + '" aria-label="Supprimer">✕</button></div>'; }).join("") : '<div class="c m">Aucun cours ajouté pour l’instant.</div>');
    $("#back").onclick = function () { go("plus"); };
    $("#fi").onchange = function () { var f = this.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { $("#ta").value = r.result; }; r.readAsText(f); };
    $("#im").onclick = function () {
      try {
        var r = importer($("#ta").value), m = '<b>' + r.ajoutees + ' question(s) ajoutée(s)</b>' + (r.nouveaux ? '<span>' + r.nouveaux + ' nouveau(x) chapitre(s).</span>' : "") + (r.rejets.length ? '<span class="m">' + r.rejets.length + ' rejetée(s) :<br>' + r.rejets.slice(0, 8).map(esc).join("<br>") + '</span>' : "");
        view.ajouter(m);
      } catch (e) { view.ajouter('<b>Import impossible</b><span class="m">' + esc(e.message) + '</span>'); }
    };
    [].forEach.call(document.querySelectorAll("[data-del]"), function (b) { b.onclick = function () { var id = b.getAttribute("data-del"); if (confirm("Supprimer ce cours et ses questions ajoutées ?")) { St.delChapter(id); build(); view.ajouter("Cours supprimé."); } }; });
  };

  // ---------- plus ----------
  view.plus = function (msg) {
    setTab("plus");
    var dur = St.reglages().duree_examen_min || 60;
    app.innerHTML = '<h1>Plus</h1>' + (msg ? '<div class="c" aria-live="polite">' + msg + '</div>' : "") + (St.warn() ? '<div class="c">Le stockage du navigateur n’est pas disponible : la progression ne sera pas conservée. Utilise la sauvegarde ci-dessous.</div>' : "") +
      '<button class="t big" data-go="ajouter"><b>Ajouter des questions</b><span class="m">Biologie moléculaire, nouveaux cours…</span></button>' +
      '<div class="c f"><b>Durée de l’examen blanc</b><div class="r"><input type="number" id="du" min="10" max="180" value="' + dur + '" style="width:80px"><span>minutes</span><button class="t" id="sd">Enregistrer</button></div></div>' +
      '<div class="c f"><b>Sauvegarde de la progression</b><span class="m">Exporte ta progression et tes cours ajoutés, puis réimporte-les sur un autre appareil.</span><button class="b g" id="ex">Exporter</button><label class="b g fileb">Importer une sauvegarde<input type="file" id="fb" accept=".json,application/json" hidden></label></div>' +
      '<button class="t" id="rz" style="color:var(--rt);justify-content:center">Réinitialiser la progression</button>';
    lier();
    $("#sd").onclick = function () { var v = Math.max(10, Math.min(180, +$("#du").value || 60)); St.setReglage("duree_examen_min", v); view.plus("Durée enregistrée : " + v + " minutes."); };
    $("#ex").onclick = function () {
      var b = new Blob([St.exportAll()], { type: "application/json" }), a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = "sauvegarde_revisions_" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
    };
    $("#fb").onchange = function () { var f = this.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { try { var n = St.importAll(r.result); build(); view.plus("Sauvegarde importée (" + n + " réponse(s) mise(s) à jour)."); } catch (e) { view.plus("Import impossible : " + esc(e.message)); } }; r.readAsText(f); };
    $("#rz").onclick = function () { if (confirm("Effacer toute la progression (réponses, erreurs, examens) ? Les questions ne sont pas supprimées.")) { St.reset(); view.plus("Progression réinitialisée."); } };
  };

  tabs.onclick = function (ev) { var b = ev.target.closest("button"); if (b) go(b.getAttribute("data-go")); };
  build(); go("accueil");
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(function () {});
})();
