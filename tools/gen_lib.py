import json, random
def maker(cid, seed=1):
    rng = random.Random(seed); Q = []
    def add(t, angle, fait, enonce, bonnes, fausses, expl, diapo):
        props = bonnes + fausses
        order = list(range(len(props))); rng.shuffle(order)
        newp = [props[i] for i in order]
        nb = sorted(k for k, i in enumerate(order) if i < len(bonnes))
        if t == "QCM" and "plusieurs réponses possibles" not in enonce:
            enonce += " (plusieurs réponses possibles)"
        Q.append({"id": "%s-q%03d" % (cid, len(Q) + 1), "chapitre": cid, "type": t, "angle": angle, "fait": fait,
                  "enonce": enonce, "propositions": newp, "bonnes": nb, "explication": expl,
                  "source": {"chapitre": cid, "diapo": diapo}})
    S = lambda a, f, e, c, w, x, d: add("QCS", a, f, e, [c], w, x, d)
    M = lambda a, f, e, b, w, x, d: add("QCM", a, f, e, b, w, x, d)
    def save(overrides=None):
        for q in Q:
            if overrides and q["id"] in overrides: q["angle"] = overrides[q["id"]]
        json.dump(Q, open("data/questions/%s.json" % cid, "w"), ensure_ascii=False, indent=1)
        print(len(Q), "questions écrites dans", cid)
    return S, M, save
