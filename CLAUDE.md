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

## Architecture du script

1. Écran, entrées clavier et tactile
2. Sprites pixel art (chaînes de caractères, 16x16, palette `PAL`), chiens, voitures
3. Tuiles (`tile()`, peintes proceduralement dans un canvas 16x16, mises en cache)
4. Carte du domaine 120x96 (`buildWorld`) et les cinq intérieurs (`makeInt`)
5. Balles au sol, objets, personnages et répliques
6. Musique chiptune WebAudio (`TRACKS.balade` en balade, `TRACKS.golf` en partie)
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

Calée sur la vue aérienne. À l'ouest de la D 130 : le practice et les trois courts de tennis.
La passerelle traverse en y=44, le passage clouté en y=57, et une voiture passe toutes les
dix secondes. À l'est : le parking, le pro shop, le secrétariat, le club house avec son patio
et son restaurant, la terrasse, la piscine au sud-est, le putting green et le départ du 1.

Le hameau du Prieuré est au nord-est. Villas forestières au nord (les Lutreau, les Jungers),
maison des Martin, pavillon des Robin, et la maison des Mamoumani avec ses vasistas et ses
vitres. Les maisons de lisière descendent au sud-est : les Webb avec le jacuzzi, les Lebel
avec le grand jardin et le portillon qui donne sur un départ, les Evenou au bord du 4.

Deux familles de maisons, à ne pas mélanger. Les **villas forestières** sont basses et
modernes : une rangée de toit plat à débord bois sombre, une rangée de baies toute hauteur
entrecoupées de piles en pierre, une terrasse bois devant. Les **maisons de lisière** sont
Île-de-France : faîtage et tuiles terracotta, lucarne, velux, bas de toit, enduit crème et
fenêtres à volets bleu-gris (`idf()` et `idf70()`). Seuls les Lebel sont en bois.
Les fenêtres cassables sont `T.SWIN` et `T.HWIN`, voir `estVitre()` et `VITRE_CASSEE`.

Les autres portes du hameau répondent mais ne s'ouvrent pas.

## Personnages

La bande : Charles Lutreau (tape fort et n'importe où, ne passe jamais la manette), Victor
Lutreau (chef de bande, répartie agressive, coeur en or), Margot Lutreau (petite soeur, reste
au hameau, jamais au club house), Oscar Webb (joue très bien, massacre la grammaire, chien
Duke), Antoine Zirimis (déposé le matin repris dimanche, met trois heures à jouer), Victor
Kuperfils dit Kupi (ne se lave pas, on s'essuie les pieds trois fois), Louis Martin
(l'intello), Paul Robin (ne parle pas, sauf au feu pour les étoiles), Olivier Bernardini
(se prend pour un basketteur), Pierre Jungers.

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
Le vélo se range tout seul quand on rentre quelque part.

## Règles de vie du monde

- Un personnage non joué par un humain repasse en PNJ avec ses habitudes. Charles est tantôt
  devant chez les Mamoumani, tantôt sur la GameCube, tantôt sur la pente. Margot ne quitte
  jamais le hameau.
- Une journée dure environ quarante minutes. À la nuit, un message propose de rejoindre le feu
  au bord du 6, à pied ou d'un coup de A avec un fondu au noir.
- À vélo dans le hameau, la bande finit toujours par rappliquer pour faire la course jusqu'au
  portail des Mamoumani, puis glander.
- Quand Antoine putte, il y en a toujours un pour dire « Antoine Zirimis, sur le green du 18,
  pour gagner l'US Open. Que se passe-t-il ? »
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

**Le jeu en ligne** : n'importe quel hébergeur Node. Le blueprint `render.yaml` monte le
service `le-prieure` avec `npm install` puis `npm start`. L'adresse du service est le lien
à envoyer aux copains, elle sert le jeu et le monde.

**La copie hors ligne** : Netlify, site `le-prieure-gba`,
id `39d12514-eacb-4dd2-8e7d-2017f2db3110`, https://le-prieure-gba.netlify.app.
`netlify.toml` publie `public/`. `npx netlify-cli login` est interactif donc inutilisable
en session non interactive : passer par le MCP Netlify, qui renvoie une commande
`npx @netlify/mcp --proxy-path ...`. Corriger le double slash `netlify-mcp.netlify.app//proxy`
en simple slash, sinon 404. Le jeton expire vite, en redemander un au besoin.
