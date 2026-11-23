(function (root) {
  var Quiz = {
    shuffle: function (a) {
      a = a.slice();
      for (var n = a.length - 1; n > 0; n--) { var j = Math.floor(Math.random() * (n + 1)), t = a[n]; a[n] = a[j]; a[j] = t; }
      return a;
    },
    // QCS : 0 ou 1. QCM : max(0, (bonnes cochées - mauvaises cochées) / nombre de bonnes)
    score: function (q, sel) {
      var ok = 0, bad = 0;
      sel.forEach(function (i) { q.bonnes.indexOf(i) > -1 ? ok++ : bad++; });
      return Math.max(0, (ok - bad) / q.bonnes.length);
    },
    etat: function (q, sel, i) {
      var c = sel.indexOf(i) > -1, b = q.bonnes.indexOf(i) > -1;
      return c && b ? "juste" : c ? "faux" : b ? "oubliee" : "neutre";
    },
    ordre: function (q) { return Quiz.shuffle(q.propositions.map(function (_, i) { return i; })); },
    session: function (qs, n) {
      return Quiz.shuffle(qs).slice(0, n).map(function (q) { return { q: q, ordre: Quiz.ordre(q) }; });
    },
    // Priorité : questions non vues, puis ratées, puis les autres ; avec un peu de hasard
    priorite: function (qs, get, n) {
      return qs.map(function (q) {
        var r = get(q.id), p = !r ? 0 : r.derniere === "faux" ? 1 : 2;
        return { q: q, k: p + Math.random() * 0.9 };
      }).sort(function (a, b) { return a.k - b.k; }).slice(0, n).map(function (x) { return x.q; });
    },
    // Examen blanc : n questions réparties équitablement entre les chapitres (reste réparti au hasard)
    exam: function (byChap, n) {
      var ids = Object.keys(byChap).filter(function (k) { return byChap[k].length; });
      if (!ids.length) return [];
      var m = ids.length, base = Math.floor(n / m), extra = n - base * m, out = [], pris = {};
      Quiz.shuffle(ids).forEach(function (id, i) {
        Quiz.shuffle(byChap[id]).slice(0, base + (i < extra ? 1 : 0)).forEach(function (q) { out.push(q); pris[q.id] = 1; });
      });
      if (out.length < n) {
        var reste = [];
        ids.forEach(function (id) { byChap[id].forEach(function (q) { if (!pris[q.id]) reste.push(q); }); });
        out = out.concat(Quiz.shuffle(reste).slice(0, n - out.length));
      }
      return Quiz.shuffle(out);
    }
  };
  if (typeof module !== "undefined") module.exports = Quiz; else root.Quiz = Quiz;
})(this);
