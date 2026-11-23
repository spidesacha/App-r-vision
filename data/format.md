# Étape 1 : architecture et format des données

## 1. Choix techniques
- **Application statique** : HTML + CSS + JavaScript sans framework, sans serveur, sans connexion une fois chargée.
- **Données** : sources en JSON dans `data/`. Un script `build.py` (étape 4) les regroupe dans `data.js` (`window.BIOCELL_DATA = {...}`), pour que l’application s’ouvre aussi en double-cliquant sur `index.html` (le chargement de fichiers JSON est bloqué sur `file://`).
- **Hors ligne sur téléphone** : PWA (`manifest.json` + `sw.js`). Elle ne s’installe que si le dossier est servi en https (ex. Netlify Drop ou GitHub Pages, gratuits). Sinon, l’application fonctionne depuis le dossier ouvert dans le navigateur.
- **Mobile d’abord** : une colonne, boutons d’au moins 44 px, mode sombre automatique.

## 2. Arborescence
```
index.html  manifest.json  sw.js  data.js (généré)  build.py  valider.py
css/style.css
js/  app.js  store.js  quiz.js  exam.js  schema.js  errors.js  dashboard.js
data/  chapitres.json  glossaire.json  cours_index.json
       questions/bc01.json … bm05.json   schemas/<chapitre>.json
       schema_question.json  schema_schema.json
assets/schemas/<id>.jpg
cours/*.pdf  pages/<id>/p-XX.jpg
```

## 3. Chapitres
14 identifiants : `bc01`–`bc09` (biologie cellulaire), `bm01`–`bm05` (biologie moléculaire). Détail dans `data/chapitres.json`.

## 4. Question (`data/questions/<chapitre>.json` = tableau)
| Champ | Règle |
|---|---|
| `id` | `bc04-q001` (chapitre + numéro à 3 chiffres, unique) |
| `chapitre` | identifiant du chapitre |
| `type` | `QCS` (une seule bonne réponse) ou `QCM` (au moins une, souvent plusieurs) |
| `angle` | `definition`, `chiffre`, `comparaison`, `vrai_faux`, `intrus`, `ordre`, `cas_pratique`, `schema_decrit` |
| `fait` | le fait du cours testé, en une phrase courte (sert à détecter les doublons) |
| `enonce` | texte de la question. Un QCM contient « (plusieurs réponses possibles) » |
| `propositions` | 4 à 5 textes, ordre mélangé à l’affichage |
| `bonnes` | indices des bonnes propositions (1 pour un QCS) |
| `explication` | 1 à 2 phrases tirées du cours |
| `source` | `{chapitre, diapo}` : **diapo = numéro de page dans le PDF**. Le numéro imprimé sur la diapo peut différer de 1 ou 2 (ex. bc04 page 40 affiche « 41 ») |

Exemples complets : `data/questions/exemple.json` (QCS, QCM vrai/faux, QCS chiffre).

### Répartition visée par chapitre (100 questions)
Environ 60 QCS et 40 QCM. Angles : définition 20, chiffre 15, comparaison 15, vrai/faux 15, intrus 10, ordre 10, cas pratique 10, schéma décrit 5. Pour les cours courts (traduction, apoptose, mitose, méiose), on atteint 100 en variant l’angle et le format sur un même fait, avec au plus **2 questions par `fait`**. Les QCM « vrai/faux » découpent un paragraphe en affirmations indépendantes.

### Notation
- **QCS** : 1 point si juste, 0 sinon.
- **QCM** : points = max(0, (bonnes cochées − mauvaises cochées) / nombre de bonnes). Après réponse, chaque proposition est colorée : cochée juste (vert), cochée fausse (rouge), oubliée (contour vert).
- Une réponse est « juste » dans les statistiques si elle vaut 1 point.

## 5. Schéma à compléter (`data/schemas/<chapitre>.json`)
Champs : `id` (`bc04-s001`), `chapitre`, `titre`, `consigne`, `image` (recadrage de la diapo dans `assets/schemas/`), `largeur`/`hauteur` en pixels, `zones`, `legendes`, `explication`, `source {chapitre, diapo}`.
- Chaque zone : `id`, `mode`, `x`, `y`, `w`, `h` (en **% de l’image**), `bonne_legende`.
  - `masque` : un rectangle blanc recouvre l’étiquette d’origine, qui est à retrouver.
  - `cible` : une pastille numérotée placée à l’extrémité d’une flèche.
- `legendes` : toutes les étiquettes proposées (bonnes + 1 à 3 intrus), mélangées à l’affichage.
- Score d’un schéma = zones justes / nombre de zones. Exemple : `data/schemas/exemple.json` (non calibré, à ajuster à l’étape 8).

## 6. Glossaire des abréviations (`data/glossaire.json`)
Au premier emploi d’un sigle dans une question (énoncé, propositions ou explication), son développement est écrit entre parenthèses juste après. Le validateur (étape 5) le contrôle avec ce fichier. Unités et noms d’histones exclus.

## 7. Sauvegarde locale (clé `biocell.v1`)
```
{ "version": 1,
  "reponses": { "<id question>": { "vues": n, "justes": n, "derniere": "juste"|"faux", "serie": n, "date": "ISO" } },
  "erreurs":  { "<id question ou schéma>": { "serie_ok": 0|1 } },
  "examens":  [ { "date": "ISO", "duree_s": n, "note": 0-20, "par_chapitre": { "bc01": {"juste": n, "total": n} } } ],
  "schemas":  { "<id schéma>": { "meilleur": 0-1, "essais": n } },
  "reglages": { "sombre": "auto", "duree_examen_min": 60 } }
```
- Lecture et écriture dans `try/catch`. En cas d’échec du stockage, l’application garde l’état en mémoire et affiche un avertissement.
- **Export** : bouton qui télécharge ce JSON. **Import** : bouton qui le recharge (fusion en gardant la valeur la plus récente).

## 8. Règles de fonctionnement
- **Mode erreurs** : une question y entre dès qu’elle est ratée. Elle en sort après 2 bonnes réponses d’affilée (`serie_ok` passe de 1 à 2, et retombe à 0 à chaque erreur). Même règle pour les schémas (score parfait).
- **Examen blanc** : 50 questions, au moins 3 par chapitre (14 × 3 = 42), plus 8 questions réparties au hasard sur 8 chapitres tirés au sort. Durée 60 min par défaut (réglable), navigation libre, aucune correction avant la fin. Note = (somme des points / 50) × 20.
- **Mode chapitre** : ordre des questions et des propositions mélangé à chaque session.

## 9. Contrôles de l’étape 5 (aperçu)
JSON conforme à `schema_question.json`, au moins 100 questions par chapitre, `bonnes` cohérent avec `type`, « plusieurs réponses possibles » dans les QCM, au plus 2 questions par `fait`, similarité entre énoncés, source existante dans `cours_index.json`, sigles développés selon le glossaire.
