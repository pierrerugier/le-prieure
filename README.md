# Le Prieuré

Jeu d'aventure et de golf en pixel art, calqué sur l'interface des Pokémon Game Boy Advance,
dans une coque de Game Boy Advance SP. Cadre : le Golf du Prieuré, à Sailly dans le Vexin,
été 2005.

Le jeu entier tient dans `public/index.html`. Un seul fichier, aucune dépendance, aucune
image externe : sprites, tuiles, blason, musique et logique sont générés par le code.

## Jouer

```bash
npm install && npm start
```

puis `http://localhost:8090`.

Le serveur sert le jeu **et** tient le monde, donc il n'y a qu'une seule adresse à partager.
Il possède les huit personnages de la bande : on en prend un en arrivant, et il repasse en
PNJ dès qu'on le lâche. L'heure du domaine, les vitres cassées et les invitations sont
communes à tout le monde.

## Tester

```bash
npm test
```

Le harnais extrait le script du HTML, stubbe le DOM et pilote le jeu image par image :
la carte, l'entrée dans chaque maison, une partie de neuf trous complète, les voitures de la
départementale, le sous-bois, le cours collectif, le feu de camp et la sauvegarde.

## Déployer

`render.yaml` monte le service en `npm install` puis `npm start`.
`netlify.toml` publie `public/` comme copie hors ligne.

Les prénoms et les répliques viennent de vraies personnes, avec leur accord.
