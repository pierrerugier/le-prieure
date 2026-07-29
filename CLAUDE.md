# Le Prieuré, version 3.0

Jeu d'aventure et de golf en pixel art, calqué sur l'interface des Pokémon Game Boy Advance,
dans une coque de Game Boy Advance SP. Cadre : le Golf du Prieuré, à Sailly dans le Vexin,
été 2005, tel qu'on le vivait à treize ans.

## Fichiers

- `public/index.html` : tout le jeu. Un seul fichier, aucune dépendance, aucune image
  externe. Sprites, tuiles, blason, musique et logique sont générés par le code.
- `server/index.js` : Express sert `public/`, ws tient le monde. Une seule adresse pour
  tout le monde, donc pas de réglage à expliquer aux copains.
- `tests/harness.js` : le harnais de test.
- `render.yaml`, `netlify.toml`, `package.json` : le déploiement.

Pour jouer en local, serveur compris :

```bash
npm install && npm start
```

puis ouvrir `http://localhost:8090`. Pour vérifier la syntaxe sans navigateur :

```bash
python3 -c "import re;s=open('public/index.html',encoding='utf-8').read();open('/tmp/g.js','w').write(re.search(r'<script>(.*)</script>',s,re.S).group(1))" && node --check /tmp/g.js
```

Le harnais extrait le script, remplace `load().finally(loop);` par un export, stubbe le DOM
et pilote `update()` image par image. Il vérifie la carte, l'entrée dans chaque maison, une
partie de neuf trous complète, les voitures, les vitres, l'horloge, le feu, le vélo et la
sauvegarde. À relancer à chaque modification du moteur :

```bash
node tests/harness.js
```

Deux raccourcis d'URL pour regarder une zone sans y marcher : `?go=x,y[,interieur]` place le
personnage au démarrage, `?demo=pente` ouvre directement le grass board.

## Le parcours

**Sept trous**, relevés sur le domaine que Pierre a redessiné dans l'atelier. Départ au sud du
putting green, on descend, on part vers l'est, on remonte le long des maisons de lisière, et on
revient par le nord. Par 28.

⚠️ `TRACE` et `HOLES` sont **deux choses différentes**, et c'est volontaire :

- `TRACE` est le tracé d'origine, celui qui a creusé le terrain au tout début. Les retouches de
  Pierre sont enregistrées comme un **écart** avec ce terrain-là. **On n'y touche jamais**,
  sinon les 7565 cases de son domaine se décalent toutes d'un coup. Il ne sert qu'à `buildWorld`.
- `HOLES` est le parcours qu'on joue. Il peut changer librement.

Les obstacles d'eau sont peints en **mare** (`T.MARE`), pas en eau vive : à droite du 1, en
bordure de green du 2, à droite du 7. `lieAt` et `land()` traitent les deux pareil, un coup de
pénalité et on rejoue d'où l'on venait.

`public/monde.json` **est le domaine**, committé dans le dépôt. Le serveur le relit quand
`data/` est vide, et le harnais de test le pose avant de jouer le parcours. Les sections 1 à 3
du harnais vérifient ce que le **code** fabrique et tournent donc sur le terrain d'origine ;
tout ce qui touche au golf tourne sur le domaine de Pierre.

Les balles à trouver sont semées par le code sur le terrain d'origine. Une d'elles peut se
retrouver dans un arbre planté depuis : `recaleBalles()` la déplace sur la case libre la plus
proche, ou la retire si le coin est bouché.

## Le golf, et ses regles

Les regles officielles, appliquees pour de vrai, et pas seulement decorees :

| situation | sanction | d'ou l'on rejoue |
|---|---|---|
| hors limites (route, parking, courts, interieurs) | 1 coup | coup et distance, la ou l'on venait |
| balle perdue dans les bois | 1 coup | coup et distance, apres dix secondes de fouille |
| eau, zone rouge | 1 coup | en arriere sur la ligne, depuis le dernier franchissement |
| balle avalee par un toit ou une vitre | 1 coup | coup et distance |
| contre un mur, un piquet, une machine | aucune | degagement gratuit au pied |
| balle injouable, declaree par le joueur | 1 coup | une case de degagement |
| plus de par plus six sur un trou | aucune | on ramasse, on note, on avance |

`sanction(tuile)` dit dans quelle famille tombe une case, `hauteurObstacle(tuile)` dit a
quelle hauteur elle arrete une balle en vol, `reculeSurLaLigne()` fait le degagement en
arriere. Une balle vit en coordonnees fractionnaires : la case qui la porte est toujours
`caseDe()`, jamais un arrondi.

Le **driver se joue partout** et envoie a 180 metres. Le chiffre affiche par le tableau de
bord est la vraie portee du club, depuis ce lie, avec ce joueur : ce que le HUD annonce, la
balle le fait. La balle **roule** apres avoir atterri, longtemps sur le green, pas du tout
dans le sable. La coupe fait la taille qu'on lui dessine.

Le tableau de bord ne montre **qu'une chose a la fois** : en haut ou l'on en est, au milieu
le club, en bas la jauge en cours. Precision d'abord, puissance ensuite.

## Les musiques

Six pistes, une par lieu, plus la balade de tous les jours. Le moteur a trois voix
(`lead`, `harm`, `bass`), un pas vaut une croche, `0` est un silence et **`-1` une tenue** :
c'est la que respire la melancolie. `swing` retarde les pas impairs, `drum` vaut 0 rien,
1 grosse caisse, 2 balai sur les temps faibles, 3 shaker.

`musWant()` lit la zone sous les pieds : club house, piscine, hameau, practice, parcours,
grass board. La nuit, dehors, c'est le theme du hameau.

## Le petit monde qui tourne

`AGENDA` donne deux ou trois postes a chaque figure du domaine, avec ses repliques du
moment. On change de poste **toutes les douze heures** (`creneau()`), et la replique suit le
poste. Une replique ecrite dans l'atelier gagne toujours sur l'agenda.

Le soir, `RENTRENT` renvoie les grands chez eux : ils disparaissent du domaine et on voit
leurs voitures remonter la departementale, phares allumes. Ils redescendent au matin.

Le feu de camp est **la ou il est peint sur la carte** (`trouveLeFeu`). Le cercle se calcule
tout seul autour : les cases libres a deux pas, rangees par angle, une place laissee au sud
pour le joueur.

## Ne jamais perdre le domaine de Pierre

Le disque de Render est **efface a chaque mise en ligne**. Les regles qui protegent
son travail, dans cet ordre :

1. L'atelier **date** chaque enregistrement (`t`). Une carte sans date vient d'avant.
2. Au chargement, on garde **la plus recente** entre le serveur et la copie de
   l'appareil. Si c'est celle de l'appareil, un bandeau le dit et propose de
   l'exporter avant de la remettre en ligne.
3. Le serveur **refuse** un enregistrement plus ancien que le sien (409). L'atelier
   demande alors confirmation avant d'ecraser.
4. `public/monde.json` reste le filet de secours, relu par le serveur et par le jeu.

Avant de deployer quoi que ce soit, verifier que `public/monde.json` est bien la
derniere version : `curl -s https://le-prieure.onrender.com/api/monde`.

## Les betes, les balles et la lettre

Les rencontres du sous-bois sont **rares** : deux chances sur mille par pas, et
jamais deux fois dans la meme minute. Le sanglier, la vipere, la limace et le ver
de terre. Les deux derniers ne font pas mal, ils degoutent, et c'est le but.

Les balles perdues sont **dans les bois** : soixante dans le sous-bois, dix autour
du club a la vue de tous, aucune dans un jardin. Une balle ramassee **revient au
bout de deux jours**, et une trace de voiturette **s'efface au bout de deux jours**.

La **lettre de Lise Lebel** : dix morceaux aux quatre coins du parcours, un objet
chacun. Quand on les a tous, elle se lit dans le menu. Son texte s'ecrit dans
l'atelier, onglet Textes, categorie « La lettre de Lise Lebel ».

## Le practice, oriente par ses tapis

`trouveLePractice()` lit les cases `T.MAT` sur la carte : **alignees en ligne on tape
perpendiculairement, alignees en colonne on tape sur le cote**, et le sens est celui ou
il y a de l'herbe devant. Tout en decoule et se recale tout seul :

- la visee du seau de balles, et la balle posee sur le tapis
- la cible du cours collectif, a cent metres dans l'axe, et ses quatre tapis
- Gilles et Pascal aux deux bouts de la ligne, Georgie un peu a l'ecart
- les panneaux 50, 100, 150 et 200, plantes de chaque cote de l'axe de tir

Pierre peut tourner le practice d'un quart de tour dans l'atelier, rien ne casse.
Un tapis de practice compte comme un depart : on y met un tee, donc le driver n'a pas
la penalite du coup joue au sol.

`POSTES_DEDANS` place ceux qui travaillent a l'interieur, et `recalePersonnages()`
s'occupe desormais aussi des interieurs : Jacky tient les vestiaires, dans l'allee
entre les deux rangees de casiers.

## La piste de grass board

Elle est **le morceau de terre d'un seul tenant** autour de `PENTE_REF`, et nulle
part ailleurs : les autres chemins de terre restent des chemins. On propose la
planche **une seule fois par passage**, pas a chaque case. Trois copains descendent
avec toi dans l'animation, et ils sont la, autour de la piste, quand tu remontes.

## Ou l'on se tient, et ce qu'on entend

`bonPoste(x,y)` dit si un personnage a le droit de se tenir la : de l'herbe, une terrasse,
une allee, de la terre. **Jamais un toit**, jamais un fourre ou l'on ne verrait que son
buste, jamais une allee du hameau, et jamais un couloir d'une seule case, sinon il bouche
le passage. `recalePersonnages()`, l'agenda, le cercle du feu et la flanerie passent tous
par la.

`bruitDuSol(tuile)` donne le pas qui va avec la surface : herbe, feuilles, sable, gravier,
terre, bois, dur, feutre, flaque. **On ne marche jamais en silence** : une case inconnue
tombe sur l'herbe.

## La coque, sur telephone

Sous 600 px de large, la console se met de cote : plus de marges, plus de coins arrondis,
plus de bandeau au-dessus de la vitre. **L'ecran prend toute la largeur**, la coque se cale
au milieu de la hauteur, et la place gagnee va aux doigts. Couche, la console s'ouvre en
deux : l'ecran a gauche, les boutons a droite, comme une manette.

## Les gens et les portes

`POSTES` dit où se tient chacun sur le domaine de Pierre : Alain devant sa cabane (39,62),
Cathy devant le pro shop (45,48), l'accueil devant le secrétariat (43-45,62), Gilles et Pascal
au bout des tapis de practice (y=56), Daniel au parking. `recalePersonnages()` rattrape le
reste après le chargement de la carte : personne ne reste planté dans un arbre, un mur ou une
mare.

`PORTES` remplace la liste `DOORS` après `buildWorld`. **La peinture des portes d'origine ne
bouge pas** (les retouches de Pierre sont un écart avec ce terrain-là), seule la logique suit
son domaine : Lutreau 113,7 — chez toi 95,20 — Lebel 81,25 — Webb 109,37 — Molina 45,55 — et
les quatre portes du club house, dont les points de chute tombent sur ses sorties.

Le **pick-up du greenkeeper** se vole comme la voiturette (`VOLABLE`), et Alain part de sa
cabane. S'il est à l'autre bout du domaine il coupe par les bois, sinon il court une heure et
personne ne le voit.

Victor Kuperfils s'appelle **Kupi**. Partout.

## L'atelier

`/editeur` ouvre un éditeur dans la même page que le jeu, avec les mêmes objets en mémoire :
la carte, le cache de tuiles, les fiches et les poses. Rien n'est dupliqué, donc ce qu'on voit
dans l'atelier est exactement ce que le jeu dessine. Le code de l'atelier est dans
`public/editeur.js`, chargé seulement en mode éditeur ; `index.html` lui passe ce qu'il faut
par `window.__PRIEURE__`.

Trois onglets :

- **Carte.** Le domaine et chaque intérieur, à n'importe quel zoom. Pinceau (taille 1 à 9),
  rectangle, pot de peinture, pipette. Alt + clic reprend le bloc déjà posé, clic droit
  déplace, molette zoome sur le curseur. Un liseré doré marque ce qui a été retouché,
  un voile rouge montre les cases où l'on ne passe pas.
- **Blocs.** La bibliothèque de tous les blocs, et un éditeur 16x16 pour en redessiner un.
  Le dessin de départ est lu dans le canvas que le code a peint, donc on part toujours de
  l'existant. Un bloc redessiné remplace toutes ses variantes.
- **Personnages.** La fiche (couleurs, coupe, taille, carrure, short, lunettes, précision,
  puissance) avec les douze poses en aperçu direct, et un éditeur de pose où chaque case est
  une **lettre de palette**, pas une couleur : les poses sont communes à toute la bande, les
  couleurs viennent de la fiche.

- **Textes.** Tout ce qui se lit dans le jeu : les répliques de chaque personnage (une par
  ligne, une boîte de dialogue par ligne), les textes de lieu qui se lancent tout seuls, et
  les objets à ramasser avec leur phrase de ramassage. Positions comprises.
- **Trame.** Les six actes et les missions dans l'ordre, groupées par acte, chacune dépliable :
  acte, titre, consigne, évènement, à qui, combien de fois, texte de fin. On monte, on descend,
  on duplique, on supprime. En haut, un champ pour **décrire une mission en français** et un
  bouton **Programmer** : le serveur passe la demande à Claude avec les évènements disponibles,
  les personnages et la trame existante, et Claude renvoie la mission déjà câblée, avec
  éventuellement des répliques à ajouter. On voit ce qu'il propose avant d'insérer.

Une mission ne peut se déclencher que sur un **évènement que le jeu sait émettre** : la liste
vit dans `EVENTS` (`index.html`) et doit rester en phase avec les appels `mission('...')`.
Ajouter un évènement, c'est ajouter l'appel dans le code ET la ligne dans `EVENTS`.

Le bouton Programmer a besoin de `ANTHROPIC_API_KEY` dans l'environnement du serveur
(Render → Environment). Sans clé, l'atelier le dit et le reste continue de marcher.
`CLAUDE_MODELE` permet de changer de modèle, `claude-opus-5` par défaut.

**Ce qu'on enregistre n'est jamais le monde entier, seulement l'écart** avec ce que le code
fabrique : une liste de cases, les blocs redessinés, les fiches et poses modifiées, les textes
retouchés, la trame si elle a bougé. Vider le fichier remet tout d'aplomb, et
`Tout remettre d'origine` le fait depuis l'atelier.

⚠️ Les personnages **se déplacent tout seuls** quand le jeu tourne : on ne peut pas deviner une
retouche en comparant les positions. L'atelier note ce qu'on modifie à la main, il ne compare
pas.

### Peinture et logique, deux choses différentes

Un départ de trou, un green, une porte, ce n'est pas de la peinture : c'est de la **logique**.
Repeindre un tapis de départ ailleurs ne déplace pas l'endroit où la partie commence. D'où
l'onglet **Départs, portes** de la carte : les neuf départs, les neuf greens et toutes les
portes s'affichent en pastilles qu'on **attrape et déplace** à la souris. C'est ça qui bouge la
logique. L'herbe autour, c'est au pinceau, séparément.

`HOLES` et `DOORS` s'enregistrent dans le monde sous `trous` et `portes`.

### Découper une tranche de terrain

L'outil **Découper** trace un rectangle. Ensuite ⌘C ou ⌘X, puis ⌘V ou un clic pour poser.
<kbd>T</kbd> tourne la tranche d'un quart de tour, <kbd>M</kbd> la retourne. Les blocs qui ont
un sens (barrières, coins, voitures, canapés) se retournent **vraiment** : `MIROIR` et `ROT`
disent quelle case remplace quelle case. Un bloc absent de ces tables reste tel quel.

### Fabriquer un bloc

Onglet **Blocs**, boutons **Nouveau 1×1** à **3×3**. On dessine le bloc **d'un seul tenant**
sur une toile, il est découpé en cases au moment d'enregistrer. On lui donne un nom, une
famille, sa franchissabilité (on passe / on ne passe pas / on saute par-dessus) et,
facultativement, une **tirade** : ce qu'il raconte quand on lui parle, avec le nom du cadre.
Il apparaît alors dans la bibliothèque, liseré doré, et se pose comme n'importe quel motif.

**Partir d'un bloc qui existe.** Le bouton `Partir du bloc choisi` (onglet Blocs) et
`En faire un bloc` (colonne de la carte) relisent le dessin case par case, recomposent la toile
entière et repartent de là avec un nouveau numéro. Ça marche pour un bloc du jeu, pour un bloc
déjà fabriqué — dont on récupère alors la tirade et la franchissabilité — et pour **une tranche
de terrain découpée sur la carte**. Six cases de côté au maximum.

Ces blocs vivent au-dessus de **400** pour ne jamais tomber sur un numéro du code, même quand
on ajoutera d'autres blocs au jeu. Un bloc de plusieurs cases occupe des numéros qui se
suivent, dans l'ordre de lecture. Ils s'enregistrent sous `blocs` dans le monde, avec leur
dessin, et `interact()` sert la tirade avant tout le reste.

### Tourner et retourner

Ce qu'on tient en main, motif de la bibliothèque ou tranche découpée, c'est la même chose :
une grille de cases. Donc <kbd>T</kbd> la tourne et <kbd>M</kbd> la retourne, dans les deux cas.

Retourner ne se contente pas de renverser les positions : ça mélangerait un dessin qui tient
sur plusieurs cases. Chaque case dit par quelle case elle est remplacée (`MIROIR`, `ROT`).
Pour les véhicules, vus de profil, le dessin en miroir n'existait pas : il y a maintenant
**quatre cases de plus par véhicule** (à partir de `T.MIR0`), dont le dessin est celui d'origine
peint à l'envers (`MIR_ART`). La case qui se retrouve en haut à gauche du véhicule retourné,
c'est le miroir de celle qui était en haut à droite, d'où le croisement dans les paires.

Ce qui est symétrique (billard, arbres, départs, canapé) se retourne sans changer de dessin,
mais la correspondance est déclarée quand même : sans elle l'atelier refuse l'opération.
`ART_MULTI` liste les cases qui font partie d'un dessin de plusieurs cases ; si l'une d'elles
n'a pas de correspondance, l'atelier **refuse et le dit** plutôt que de produire une bouillie.
Une voiture ne se tourne pas d'un quart de tour : il n'existe pas de dessin vu de dessus.

### Dans la main

La colonne de gauche montre en permanence **ce qu'on tient** : une vignette qui se redessine,
le nom, la taille, et les boutons `↻ Tourner` et `⇄ Retourner` juste à côté. Sans cette
vignette, tourner un bloc d'une seule case ne se voyait nulle part et on croyait le bouton
cassé, alors qu'il marchait.

Tout est en français jusque dans les infobulles, et la barre d'info sous la carte donne le nom
de la bibliothèque, pas le nom technique de la case.

### La tranche en main

Une tranche découpée est **en main** ou **en mémoire**. En main, elle suit le curseur ; un clic
la pose **et la lâche**. Alt + clic pour en poser plusieurs. `Reprendre` ou ⌘V la remet en main,
`Lâcher` ou Échap la lâche, et changer d'outil la lâche aussi. Sans ça elle collait au curseur
sans qu'on sache comment s'en débarrasser.

### Une case posée sur une autre

Un transat, un arbre, un feu de camp : ça ne remplace pas le sol, ça se **pose dessus**. Ces
cases-là sont dans `TRANSP` et **ne peignent aucun fond**. `put()` et `iput()` s'en aperçoivent
et fabriquent un numéro composé : le sol dans les bits du haut, l'objet dans ceux du bas
(`compose`, `fondDe`, `motifDe`). Aucune table à tenir, rien à enregistrer de plus, et un arbre
posé sur du fairway garde le fairway dessous.

- `map` est un `Uint32Array` : un numéro composé ne tient pas sur seize bits.
- `at()` et `getTile()` rendent la case **d'origine** : tout le jeu continue de raisonner sur
  ce qu'une case *est*. Pour lire la case brute, c'est `map[]` directement, et c'est ce que
  fait le dessin.
- `SOLID`, `SAUT`, `ARBRES`, `DEPARTS` résolvent aussi : leur `.has` passe par `baseT`.
- Une carte enregistrée avant tout ça peut contenir un objet sans sol ; `drawScene` lui en
  pose un par défaut plutôt que de laisser un trou.

⚠️ Un terrain, un mur, un toit, un sol d'intérieur **ne sont pas** dans `TRANSP` : ils sont ce
sur quoi on pose. Un bloc fabriqué dans l'atelier peut l'être, il le dit lui-même (`transp`).

### Les voitures

⚠️ **Vues d'en haut, capot vers le nord.** Le domaine se regarde de dessus : une voiture de
profil jure sur une route vue du ciel, ça a été essayé et c'était raté. Ne pas y revenir.
C'est le quart de tour de l'atelier qui les oriente, et il tombe juste puisque la vue est
orthographique.

Sept modèles sur quatre cases. Chacun a son **profil de demi-largeur** le long de la caisse
(`TOPS`), du capot au coffre : c'est ça qui distingue une berline d'un 4x4 et d'une citadine.
Longues et étroites, jamais trapues : environ deux fois plus longues que larges.

Trois pièges déjà tombés dedans :

- **Les roues se posent avant la caisse et dépassent de deux pixels de chaque côté.** Sinon la
  carrosserie les avale et la voiture n'a plus de roues.
- **Les vitres sont encadrées de tôle.** Une bande de verre d'un bord à l'autre fait une barre
  noire en travers, pas un pare-brise.
- **Pas de trait blanc devant.** Les feux sont deux marques minuscules prises dans la
  carrosserie, jamais un rectangle qui déborde.

Rien ne peint de sol : elles sont dans `TRANSP` comme le reste du mobilier.

### Les courts de tennis

Deux courts entiers, **quatre cases de large sur six de haut**, en quick et en terre battue.
Le tracé est dessiné d'un seul tenant sur 64 × 96 pixels puis découpé : couloirs, lignes de
fond, lignes de service, ligne médiane, marques du milieu. Le filet est en haut de la
**quatrième rangée**, avec sa bande blanche, sa sangle centrale et ses poteaux : ces quatre
cases sont dans `SOLID` **et** dans `SAUT`, donc on ne les traverse pas et on saute par-dessus
avec A. Tout le reste du court se marche.

Un court est un **sol**, pas un objet : il n'est pas dans `TRANSP`, il remplace ce qu'il y a
dessous. La terre battue a ses passages de filet de traînage et ses traces de glissade,
dispersés et jamais réguliers, sinon ça fait une échelle.

### La gamme d'arbres

Dessinés sur du vide, avec de vraies silhouettes rondes : `boule()` trace un disque en pixels,
`couronne()` empile plusieurs boules qui se chevauchent, les cerne de sombre, éclaire en haut à
gauche et creuse deux trous en bas à droite. Deux, pas plus : au-delà ça fait des griffures et
non du feuillage. Petit arbre, arbre, bouleau, chêne, hêtre roux, saule, chêne majestueux,
grand pin, buissons, massif.

### La bibliothèque

`BIBLI` (dans `index.html`) est la liste rangée : chaque entrée a une famille, un nom, et soit
une case unique, soit un **motif** de plusieurs cases posé d'un seul clic. L'atelier filtre par
famille et par **franchissabilité** (on passe, on ne passe pas, on saute par-dessus), déduite
de `SOLID` et `SAUT`.

Les gros motifs (arbres 2×2, voitures, billard, canapé, départ de trou) sont dessinés **d'un
seul tenant** par une fonction, et chaque case n'en montre qu'un morceau via `grand()`. Ajouter
un motif, c'est ajouter la fonction de dessin, les identifiants à la suite dans `T`, les `case`
dans `tile()`, et la ligne `motif(...)` dans `BIBLI`.

⚠️ **On ajoute les identifiants à la suite, on ne renumérote jamais** : les cartes déjà
enregistrées parlent en numéros. La carte est un `Uint16Array` pour avoir de la place.

### La nuit

Pas de halo doux : la Game Boy Advance n'en fait pas. `nightTint` peint le noir sur une toile
deux fois plus petite, y perce des trous **par paliers francs**, et recolle sans lissage. Les
gros pixels qui en sortent, c'est le rendu voulu. Même principe pour la fumée de cigarette.

- le feu de camp éclaire quand il brûle,
- les **lampadaires** (`T.LAMPH`) éclairent de 19 h à 7 h,
- les **baies vitrées** s'allument de 19 h à 23 h et éclairent un peu devant elles, puis
  s'éteignent pour le reste de la nuit.

`?h=21` dans l'URL cale l'heure du domaine, pratique pour regarder un rendu de nuit.

Le serveur garde ça dans `data/monde.json` (`GET`/`POST /api/monde`) et prévient les joueurs
connectés, qui appliquent la retouche sans recharger.

⚠️ **Sur Render le disque est effacé à chaque déploiement.** C'est déjà arrivé une fois : un
monde de 1364 cases retouchées est parti. Trois filets, dans cet ordre :

1. L'atelier écrit **aussi** dans le `localStorage` du navigateur à chaque enregistrement.
   Au chargement, si le serveur revient **vide** (`mondeVide()`), c'est la copie locale qui
   reprend la main, et l'atelier affiche un bandeau pour la remettre en ligne d'un clic.
2. `public/monde.json`, committé dans le dépôt, est relu par le serveur quand `data/` est vide.
   C'est le seul endroit vraiment durable : **après une bonne session, exporter et committer.**
3. Le bouton `Exporter` télécharge le fichier.

Sans serveur (Netlify, fichier local), l'atelier travaille dans le `localStorage` seul.

## Architecture du script

1. Écran, entrées clavier et tactile
2. Sprites pixel art (chaînes de caractères, 16x16, palette `PAL`), chiens, voitures
3. Tuiles (`tile()`, peintes proceduralement dans un canvas 16x16, mises en cache)
4. Carte du domaine 120x96 (`buildWorld`) et les cinq intérieurs (`makeInt`)
5. Balles au sol, objets, personnages et répliques
6. Son WebAudio : quatre musiques (`TRACKS.balade`, `.golf`, `.practice`, `.grassboard`),
   une banque de bruitages dans `sfx()` (pas, feuilles, sable, drive, fer, putt, coups des
   autres, atterrissage, mur, trou, plouf, nage, page de dialogue, ramassage, porte, vélo,
   klaxon, moteur, verre), et deux ambiances continues dans `ambiances()` : le crépitement
   du feu quand on s'en approche la nuit, et le roulement du grass board, du vélo et de la
   voiturette. La musique se coupe au menu, les bruitages restent.
7. Départementale et voitures, éclats de verre, clopes, mini-carte
8. Golf : partie à quatre, IA des copains, putting zoomé, balle perdue
9. Bagarres, pente en planche, vélo dans le hameau, menus, titre, boucle, sauvegarde
10. Choix du personnage et couche réseau (`net`)

## Contraintes de direction artistique

- Écran logique 240x160, tuiles de 16 pixels, `image-rendering: pixelated`
- Une case vaut 14 mètres. Driver 150 m, bois 3 140, fer 5 130, fer 7 115, fer 9 95, wedge 70
- Boîtes de dialogue façon GBA, nom du personnage dans un cadre au-dessus, texte qui se tape
- Jamais de tiret cadratin dans les textes français du jeu
- Ton : drôle, sec, jamais nostalgique à voix haute. Une idée par phrase
- Aucun bloc de texte ne doit en chevaucher un autre. Le cadre du nom s'arrête à y=112,
  la boîte de dialogue commence à y=112
- `BODY_SIDE` et `DOG_SIDE` sont dessinés **tournés vers la droite** : la mèche et la
  casquette à gauche, l'oeil et la main à droite. Le miroir s'applique donc à gauche
  (`dir===2`) et jamais à droite. Si on redessine ces sprites dans l'autre sens, il faut
  inverser tous les appels de `drawSprite`. Deux tests du harnais gardent la règle.
- Les sprites font seize lignes, les semelles tombent sur la dernière. L'ombre se dessine
  donc à `+16`, jamais plus bas, sinon le personnage flotte. Le chien est posé trois pixels
  plus bas, son ombre suit à `+18`.
- Seize images par case à pied, huit à vélo, comme sur GBA. Dans le sous-bois, on rame

## Géographie

Calée sur les croquis de Pierre. À l'ouest de la D 130 : le practice et les trois courts de
tennis. Une passerelle traverse en y=44, mais **la route se traverse où on veut**, à ses
risques et périls : une voiture toutes les dix secondes, et un avertissement s'affiche quand
on s'engage. À l'est : le parking, long et bordé d'une rangée de platanes côté route, avec
huit voitures nommées ; le secrétariat et le pro shop à l'entrée ; le club house avec son
patio ; la terrasse ; la piscine dans son terrain clos, vestiaires à l'ouest formant le mur
et transats sur la pelouse à l'est ; le putting green à trois trous et le départ du 1.

**Au nord du practice, de l'autre côté de la route**, il y a le **712**, le club des sept à
douze ans : un long bâtiment, six trous de mini-golf devant qui ne se jouent pas, un bois
autour avec une cabane. On y croise des gosses qui racontent n'importe quoi et deux monos,
Cyril et Laetitia, sympas mais beaufs, qui rappellent la pièce Harry Potter où tout le monde
avait joué. La bande n'a plus l'âge depuis deux ans. Juste à côté, à sa droite, la **baraque
des Mamoumani** et ses vitres.

Le hameau du Prieuré est au nord-est : **huit villas forestières** éparpillées, chacune avec
son bout de pelouse et des haies de sous-bois franchissables. Trois d'entre elles
n'appartiennent à personne. Le hameau et les maisons de lisière forment **un seul domaine**,
cerné de bois et clos par une haie, desservi par la même voie.

**Cinq maisons de lisière** alignées le long des trous 4 et 5, sur le flanc est. D'ouest en
est : le parcours, une bande de bois, les jardins séparés par des haies avec un passage d'un
jardin à l'autre, les maisons, et la voie du hameau qui les dessert par derrière. Du nord au
sud : Webb (jacuzzi), Lebel (en bois, symétrique), Martin, Kuperfils, Godot.

**Trois baraques Evenou** alignées tout au sud-est, pavillons blancs des années 70 à grands
jardins. Elles ne font pas partie du hameau : des **champs d'agriculteurs** les en séparent. **Les Robin** sont coincés dans l'arc que dessine le parcours, plus
près du club house, avec leur petite allée qui rejoint la route du club.

Deux familles de maisons, à ne pas mélanger. Les **villas forestières** sont basses et
modernes : une rangée de toit plat à débord bois sombre, une rangée de baies toute hauteur
entrecoupées de piles en pierre, une terrasse bois devant. Les **maisons de lisière** sont
Île-de-France : faîtage et tuiles terracotta, lucarne, velux, bas de toit, enduit crème et
fenêtres à volets bleu-gris (`idf()` et `idf70()`). Seuls les Lebel sont en bois.
Les fenêtres cassables sont `T.SWIN` et `T.HWIN`, voir `estVitre()` et `VITRE_CASSEE`.

Les autres portes du hameau répondent mais ne s'ouvrent pas.

## Fiches de golf

Chaque personnage a une précision et une puissance de 1 à 5 dans `FICHES`. Plus on est
précis, plus la jauge de précision oscille lentement et moins la balle part de travers.
Plus on est puissant, plus la jauge de puissance oscille lentement et plus la balle va loin.
Charles est le seul à rater des air shots. Les allures se composent par surcouches sur le
corps de base : coupe de cheveux, lunettes, carrure, short, taille, couleurs.

## Personnages

La bande : Charles Lutreau (tape fort et n'importe où, ne passe jamais la manette), Victor
Lutreau (chef de bande, répartie agressive, coeur en or), Margot Lutreau (petite soeur, reste
au hameau, jamais au club house), Oscar Webb (joue très bien, massacre la grammaire, chien
Duke), Antoine Zirimis (déposé le matin repris dimanche, met trois heures à jouer), Victor
Kuperfils dit Kupi (ne se lave pas, on s'essuie les pieds trois fois), Louis Martin
(l'intello), Paul Robin (ne parle pas, sauf au feu pour les étoiles), Olivier Bernardini
(se prend pour un basketteur), Pierre Jungers.

Les Bernardini **n'ont pas de maison au hameau**. Olivier vient, il n'habite pas là. Ne pas
lui redonner de villa.

Margaux Lebel : fille unique, peint sur bois, ne sort jamais de chez elle. PNJ, pas jouable,
comme Margot.

Les Evenou, au bord du 4 : Arthur (pyromane mythomane, échange un paquet de clopes contre une
Pro V1), Valentine, Julien, et leur cousine Camille.

Les vieux, non-stop au golf : Sylvie de Kersauson la fofolle, Hervé Huet le discret, Sophie
Godot, Sorin Margulis l'avocat pénal, Perrine Dutreuil la grand-mère des Lutreau, Georgie
Leven. Plus des randoms sans potes sur le parcours.

Les employés : Alain le caddie master qui chambre, Daniel le starter fainéant et sa voiturette
à sièges orthopédiques, Jackie au vestiaire hommes (coupe Johnny, 2 CV), Cathy au pro shop,
Gilles Bourdy et Pascal Amielh les pros au practice. À l'accueil il y a toujours deux personnes
sur trois, ça tourne : William qui joue à World of Warcraft, Philippe le transparent, Hélène
la dynamique.

Chiens : Panique chez les Lutreau, une femelle caramel et adorable, et Duke chez les Webb,
jack russell blanc et ingérable.

## Le terrain

Les blocs d'arbres (`T.TREE`) sont infranchissables et forment le mur du monde sur les trois
cases du bord. Le sous-bois vert sombre (`T.DENSE`) se traverse : le personnage y est enfoui
jusqu'à la taille (on ne dessine que les dix premières lignes du sprite, plus des touffes
par-dessus), il avance nettement moins vite, et chaque pas fait voler des feuilles coupées.
C'est là qu'on trouve les balles, et elles ne se voient pas avant qu'on marche dessus.
Les balles du rough, elles, restent visibles de loin.

On entre chez les Lutreau, les Lebel, les Webb, chez soi et au club house. Chaque salon a
sa cheminée, son canapé, sa table basse, sa télévision, sa cuisine avec évier et frigo.
Le vélo se range tout seul quand on rentre quelque part. **A devant une haie saute
par-dessus**, si ça retombe sur quelque chose de franchissable.

Trois villas du hameau n'appartiennent à personne, et c'est très bien comme ça. À la fenêtre
de l'une d'elles, on peut mater Candice et Jennifer. Trois fois, pas plus.

## Le club house

Plan repris du croquis. **Trois portes en façade**, chacune avec son point de chute :
à gauche le vestibule, au centre le passage vers le patio, à droite le restaurant.

Aile ouest, du sud au nord : le vestibule et son escalier vers le premier étage, puis un
couloir bordé de vitrines à trophées avec les toilettes de chaque côté, puis la pièce qui
distribue les vestiaires, femmes au rez-de-chaussée et hommes à l'étage. Les photos d'équipe
montrent les daronnes de tout le monde, et il y a même un Imad Lahoud sur l'une d'elles.

Au centre : la salle de billard qui donne sur le patio, le patio et sa fontaine, et au sud la
salle cheminée, sol en pierre, trois groupes de fauteuils clubs marron avec leur table basse
en bois, et la grosse cheminée sur la droite. À l'est : le bar, le restaurant et les cuisines
au fond.

## Règles de vie du monde

- Un personnage non joué par un humain repasse en PNJ avec ses habitudes. Charles est tantôt
  devant chez les Mamoumani, tantôt sur la GameCube, tantôt sur la pente. Margot ne quitte
  jamais le hameau.
- Une journée dure environ quarante minutes. À la nuit, un message propose de rejoindre le feu
  au bord du 6, à pied ou d'un coup de A avec un fondu au noir.
- À vélo dans le hameau, la bande finit toujours par rappliquer pour faire la course jusqu'en
  haut de la pente, puis glander.
- La descente en planche s'appelle **le grass board**, jamais autrement. Elle a sa propre
  musique, plus rapide, et les autres gueulent « GRASS BOARD » pendant la descente.
  Malgré le nom, **ça se passe sur de la terre** : une petite pente dans le bois derrière le
  hameau, pas sur du gazon. Le décor est un sentier de terre battue avec deux ornières, des
  racines en travers, des cailloux et des feuilles qui défilent, une frange d'herbe rase sur
  les bords, des ronces, puis les troncs du bois et la voûte des feuilles au-dessus, percée de
  quelques trouées de ciel. Ne jamais le redessiner en herbe tondue.
  L'objectif tient en une ligne : **dix portes de slalom** à passer entre deux branches
  plantées, ruban de chantier rouge et blanc tant qu'on ne l'a pas prise, vert une fois passée.
  Aucun obstacle à éviter, aucune chute : les ronces des deux bords freinent et repoussent,
  c'est tout. La largeur dessinée (`10+55*sc`) doit rester égale à la largeur jouable
  (34 unités x 1.9), sinon on frotte une ronce qu'on ne voit pas.
- Quand Antoine putte, il y en a toujours un pour dire « Antoine Zirimis, sur le green du 18,
  pour gagner l'US Open. Que se passe-t-il ? »
- Le foyer est **froid en journée** : un cercle de pierres et du bois noirci. Il ne brûle
  qu'à la nuit. Il n'y a rien pour s'asseoir, on est par terre, et les canettes finissent
  dans les fougères derrière.
- Chaque personnage a son intro, et **ce sont les parents qui parlent** : la mère de Pierre
  qui exige dix-huit trous, la mère Lutreau qui laisse tout faire, les Martin très snob, la
  mère d'Oscar qui se trompe de genre, les Robin tranquilles, les Zirimis qui repartent, et
  les Kuperfils sur les chaussures et la collection de poules de Laurence.
- Autour du feu, les dialogues défilent tout seuls, sans appuyer sur A. Quatrième argument
  de `say(lignes, callback, qui, auto)`. Une conversation part d'elle-même si on reste
  près du feu la nuit.
- Les pros du practice proposent un cours collectif : la bande s'aligne sur les tapis, dix
  balles chacun sur une cible, le meilleur score de précision gagne une Pro V1.
- Trois activités lancent une invitation aux autres joueurs en ligne : le cours collectif,
  la pente en planche et la baraque des Mamoumani. Accepter téléporte avec un fondu.

## En ligne

**Le serveur est autoritaire.** Il possède en permanence les huit personnages de la bande.
Quand quelqu'un se connecte il en prend un ; le personnage sort alors des PNJ chez tout le
monde. Dès qu'on le lâche, à la déconnexion ou après trente secondes sans nouvelles, il
repasse en PNJ et le serveur lui redonne un endroit où être. L'écran de choix affiche
« pris » sur les personnages déjà tenus par quelqu'un.

Le serveur tient aussi l'heure du domaine, les vitres cassées et les invitations. Il diffuse
un instantané dix fois par seconde : joueurs, PNJ, heure, phase.

Le client se connecte à la même origine que la page (`netURL()`), donc **il n'y a qu'un seul
lien à envoyer** : celui du serveur. `?srv=wss://...` permet de viser un autre serveur. La
copie Netlify ne cherche aucun serveur : c'est la version hors ligne, jouable telle quelle.

Les positions des PNJ ne transitent pas case par case : le serveur envoie une destination et
chaque client y emmène le personnage. Tout le monde converge au même endroit en quelques
secondes, sans avoir à répliquer la carte côté serveur.

Vérifier le serveur : `curl http://localhost:8090/sante`.

## Ce qui reste à faire

- Un vrai écran de fin de partie avec le classement des quatre joueurs
- Plus de variété dans les rencontres de forêt
- Faire descendre la bande à vélo sur la pente en terre
- La cousine Camille, annoncée mais jamais arrivée

## Déploiement

**Le jeu en ligne** : https://le-prieure.onrender.com , c'est le lien à envoyer. Service
Render `le-prieure` (`srv-d9jhcjnavr4c73chm3d0`), plan gratuit, monté depuis le blueprint
`render.yaml`. Il sert le jeu et le monde sur la même adresse.

Piège de comptes : le navigateur et Render sont sur le GitHub **pierrejungers**, alors que
le dépôt est sur **pierrerugier**. Render n'a donc pas accès au dépôt via l'application
GitHub, et le service a été monté par **Public Git Repository** (URL publique collée à la
main). Conséquence : pas de déploiement automatique au push. Après un `git push`, cliquer
**Manual Deploy → Deploy latest commit** sur le tableau de bord, ou récupérer le crochet de
déploiement dans Settings. Pour retrouver l'automatique, il faudrait installer l'application
Render sur le compte `pierrerugier`.

Le plan gratuit s'endort après quinze minutes sans personne, le réveil prend ~50 s.

**La copie hors ligne** : Netlify, site `le-prieure-gba`,
id `39d12514-eacb-4dd2-8e7d-2017f2db3110`, https://le-prieure-gba.netlify.app.
`netlify.toml` publie `public/`. `npx netlify-cli login` est interactif donc inutilisable
en session non interactive : passer par le MCP Netlify, qui renvoie une commande
`npx @netlify/mcp --proxy-path ...`. Corriger le double slash `netlify-mcp.netlify.app//proxy`
en simple slash, sinon 404. Le jeton expire vite, en redemander un au besoin.
