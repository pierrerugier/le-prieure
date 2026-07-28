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
