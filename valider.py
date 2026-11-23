#!/usr/bin/env python3
"""Validation des fichiers de questions : python3 valider.py [bc04 ...]  (sans argument : tous les chapitres présents)"""
import json, re, sys, os, difflib, collections
os.chdir(os.path.dirname(os.path.abspath(__file__)))
chap = json.load(open("data/chapitres.json", encoding="utf-8"))
idx = {c["id"]: c for c in json.load(open("data/cours_index.json", encoding="utf-8"))}
gl = json.load(open("data/glossaire.json", encoding="utf-8"))["glossaire"]
sigles = [s for s in gl if re.fullmatch(r"[A-Za-zα-ωÀ-ÿ0-9\-]+", s)]
ANGLES = {"definition", "chiffre", "comparaison", "vrai_faux", "intrus", "ordre", "cas_pratique", "schema_decrit", "identification", "association"}
L = "A-Za-zÀ-ÿ0-9"

def hors_parentheses(t):
    prof, mask = 0, []
    for ch in t:
        if ch == "(": prof += 1
        mask.append(prof > 0)
        if ch == ")": prof = max(0, prof - 1)
    return mask

def occ_non_developpees(t):
    """sigles présents hors parenthèses et non suivis de « ( »"""
    mask, res = hors_parentheses(t), {}
    for s in sigles:
        for m in re.finditer(r"(?<![%s])%s(?![%s])" % (L, re.escape(s), L), t):
            if mask[m.start()]: continue
            suite = t[m.end():].lstrip()
            res.setdefault(s, []).append(suite.startswith("("))
    return res

def abbr_erreurs(q):
    err = []
    ev = occ_non_developpees(q["enonce"])
    for s, l in ev.items():
        if not l[0]: err.append("sigle « %s » non développé dans l’énoncé" % s)
    for p in q["propositions"]:
        for s, l in occ_non_developpees(p).items():
            if s in ev: continue
            if not all(l): err.append("sigle « %s » non développé dans une proposition" % s)
    vus = set(ev) | {s for p in q["propositions"] for s in occ_non_developpees(p)}
    for s, l in occ_non_developpees(q["explication"]).items():
        if s in vus: continue
        if not l[0]: err.append("sigle « %s » non développé dans l’explication" % s)
    return err

def valider(cid):
    f = "data/questions/%s.json" % cid
    if not os.path.exists(f): return None
    qs = json.load(open(f, encoding="utf-8")); E, W = [], []
    nb = idx[cid]["nb_diapos"]; faits = collections.Counter()
    ids = set()
    for q in qs:
        i = q.get("id", "?")
        try:
            assert re.fullmatch(r"%s-q\d{3}" % cid, i), "id invalide"
            assert i not in ids, "id en double"; ids.add(i)
            assert q["chapitre"] == cid, "chapitre incohérent"
            assert q["type"] in ("QCS", "QCM"), "type invalide"
            assert q["angle"] in ANGLES, "angle invalide"
            assert 4 <= len(q["propositions"]) <= 5, "4 à 5 propositions"
            assert len(set(q["propositions"])) == len(q["propositions"]), "propositions en double"
            assert q["bonnes"] and all(0 <= b < len(q["propositions"]) for b in q["bonnes"]) and len(set(q["bonnes"])) == len(q["bonnes"]), "bonnes invalide"
            assert (q["type"] == "QCS") == (len(q["bonnes"]) == 1), "type et nombre de bonnes incohérents"
            if q["type"] == "QCM":
                assert len(q["bonnes"]) < len(q["propositions"]), "un QCM ne peut pas avoir toutes les propositions justes"
                assert "plusieurs réponses possibles" in q["enonce"], "mention « plusieurs réponses possibles » absente"
            assert q["explication"].strip() and q["fait"].strip(), "explication ou fait vide"
            assert q["source"]["chapitre"] == cid and 1 <= q["source"]["diapo"] <= nb, "source hors du cours"
        except (AssertionError, KeyError) as e:
            E.append("%s : %s" % (i, e)); continue
        faits[q["fait"]] += 1
        for m in abbr_erreurs(q): E.append("%s : %s" % (i, m))
    for k, n in faits.items():
        if n > 2: E.append("fait utilisé %d fois (max 2) : %s" % (n, k))
    def noyau(t):
        for b in ("(plusieurs réponses possibles)", "Parmi ces affirmations sur", "lesquelles sont exactes ?", "Quelles affirmations sont exactes ?", "Quelles"):
            t = t.replace(b, "")
        return t.strip()
    en = [noyau(q["enonce"]) for q in qs]
    for a in range(len(en)):
        for b in range(a + 1, len(en)):
            r = difflib.SequenceMatcher(None, en[a], en[b]).ratio()
            pa, pb = set(qs[a]["propositions"]), set(qs[b]["propositions"])
            jac = len(pa & pb) / len(pa | pb)
            if r > 0.9 and jac > 0.4: E.append("questions en doublon : %s / %s (énoncé %.2f, propositions %.2f)" % (qs[a]["id"], qs[b]["id"], r, jac))
            elif r > 0.9: W.append("énoncés identiques à propositions différentes : %s / %s" % (qs[a]["id"], qs[b]["id"]))
    n, qcs = len(qs), sum(q["type"] == "QCS" for q in qs)
    if n < 100: E.append("%d questions (minimum 100)" % n)
    if not (55 <= qcs <= 65): W.append("répartition %d QCS / %d QCM (cible 60 / 40)" % (qcs, n - qcs))
    ang = collections.Counter(q["angle"] for q in qs)
    return cid, n, qcs, ang, E, W

ids = sys.argv[1:] or [c["id"] for c in chap]
ok = True
for cid in ids:
    r = valider(cid)
    if not r: continue
    cid, n, qcs, ang, E, W = r
    print("== %s : %d questions (%d QCS, %d QCM) | angles : %s" % (cid, n, qcs, n - qcs, dict(ang)))
    for e in E: print("  ERREUR", e)
    for w in W: print("  attention", w)
    ok &= not E
print("VALIDATION OK" if ok else "VALIDATION ECHEC"); sys.exit(0 if ok else 1)
