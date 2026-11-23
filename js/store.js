(function (root) {
  var KEY = "biocell.v1", CK = "biocell.custom.v1", warn = false;
  function ls() { try { return root.localStorage; } catch (e) { return null; } }
  function load(k, def) { try { var s = ls().getItem(k); return s ? JSON.parse(s) : def; } catch (e) { warn = true; return def; } }
  function save(k, v) { try { ls().setItem(k, JSON.stringify(v)); return true; } catch (e) { warn = true; return false; } }
  var st = load(KEY, null) || { version: 1, reponses: {}, erreurs: {}, examens: [], jours: {}, reglages: { duree_examen_min: 60 } };
  var cu = load(CK, null) || { chapitres: [], questions: [] };
  st.reponses = st.reponses || {}; st.erreurs = st.erreurs || {}; st.examens = st.examens || []; st.jours = st.jours || {}; st.reglages = st.reglages || { duree_examen_min: 60 };
  function persist() { save(KEY, st); }
  function day(d) { return (d || new Date()).toISOString().slice(0, 10); }
  var Store = {
    warn: function () { return warn || !ls(); },
    get: function (id) { return st.reponses[id] || null; },
    reponses: function () { return st.reponses; },
    erreurs: function () { return st.erreurs; },
    examens: function () { return st.examens; },
    reglages: function () { return st.reglages; },
    setReglage: function (k, v) { st.reglages[k] = v; persist(); },
    dernier: function () { return st.dernier || null; },
    setDernier: function (id) { st.dernier = id; persist(); },
    record: function (q, pts) {
      var r = st.reponses[q.id] || (st.reponses[q.id] = { vues: 0, justes: 0, derniere: null, serie: 0, date: null });
      var ok = pts >= 1; r.vues++;
      if (ok) { r.justes++; r.serie++; } else { r.serie = 0; }
      r.derniere = ok ? "juste" : "faux"; r.date = new Date().toISOString();
      if (!ok) { st.erreurs[q.id] = { serie_ok: 0 }; }
      else if (st.erreurs[q.id]) { st.erreurs[q.id].serie_ok++; if (st.erreurs[q.id].serie_ok >= 2) delete st.erreurs[q.id]; }
      var d = day(); st.jours[d] = (st.jours[d] || 0) + 1; persist();
    },
    addExam: function (e) { st.examens.push(e); persist(); },
    serie: function () {
      var n = 0, d = new Date();
      if (!st.jours[day(d)]) d.setDate(d.getDate() - 1);
      while (st.jours[day(d)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
    custom: function () { return cu; },
    addCustom: function (chs, qs) {
      chs.forEach(function (c) { if (!cu.chapitres.some(function (x) { return x.id === c.id; })) cu.chapitres.push(c); });
      qs.forEach(function (q) { cu.questions.push(q); });
      return save(CK, cu);
    },
    delChapter: function (id) {
      cu.chapitres = cu.chapitres.filter(function (c) { return c.id !== id; });
      cu.questions = cu.questions.filter(function (q) { return q.chapitre !== id; });
      save(CK, cu);
    },
    exportAll: function () { return JSON.stringify({ app: "biocell", version: 1, progression: st, ajouts: cu }); },
    importAll: function (txt) {
      var o = JSON.parse(txt);
      if (!o || o.app !== "biocell" || !o.progression) throw new Error("Ce fichier n’est pas une sauvegarde de l’application.");
      var p = o.progression, n = 0;
      Object.keys(p.reponses || {}).forEach(function (id) {
        var a = st.reponses[id], b = p.reponses[id];
        if (!a || (b.date || "") > (a.date || "")) { st.reponses[id] = b; n++; }
      });
      Object.keys(p.erreurs || {}).forEach(function (id) { if (!st.erreurs[id]) st.erreurs[id] = p.erreurs[id]; });
      (p.examens || []).forEach(function (e) { if (!st.examens.some(function (x) { return x.date === e.date; })) st.examens.push(e); });
      Object.keys(p.jours || {}).forEach(function (d) { st.jours[d] = Math.max(st.jours[d] || 0, p.jours[d]); });
      var a = o.ajouts || { chapitres: [], questions: [] }, ids = {};
      cu.questions.forEach(function (q) { ids[q.id] = 1; });
      Store.addCustom(a.chapitres || [], (a.questions || []).filter(function (q) { return !ids[q.id]; }));
      persist(); return n;
    },
    reset: function () { st = { version: 1, reponses: {}, erreurs: {}, examens: [], jours: {}, reglages: st.reglages }; persist(); }
  };
  root.Store = Store;
})(this);
