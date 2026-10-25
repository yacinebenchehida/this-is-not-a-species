# La mare aux canards — dérive génétique

[English](README.md) · **[Ouvrir l’animation](https://yacinebenchehida.github.io/this-is-not-a-species/fr/simulations/population-genetics/genetic-drift/play.html)**

Explorez comment le hasard transforme la composition génétique d’une population. Chaque canard porte deux copies d’un gène, représentées par des perles turquoise et corail. Tous les canards ont le même corps jaune : sa couleur ne représente ni le sexe ni le génotype.

## Quelques expériences à essayer

1. Appuyez sur **Lecture** ou **Génération suivante**. Réglez l’effectif, la proportion initiale de turquoise et la vitesse des générations.
2. Dans une petite mare, activez **Observer chaque accouplement** pour suivre les parents de chaque caneton, un couple à la fois. Les cœurs relient ses parents ; les lignes et les perles en mouvement montrent les copies reçues.
3. Observez le réservoir de gènes et le nid se remplir pour la génération suivante. Les compteurs de canetons apparaissent en mode détaillé. Les canards gris endormis n’ont transmis aucune copie cette fois-ci : c’est le hasard, et non un désavantage biologique.
4. Recommencez avec les mêmes réglages pour conserver les trajectoires précédentes en traits pâles. L’affichage suit aussi les canards portant les deux allèles et les résultats des expériences terminées.
5. Utilisez **Plusieurs mares à la fois** pour explorer les différences entre expériences, ou comparez des populations de 6 et de 96 canards.

Dans ce modèle neutre, la proportion initiale d’un allèle est égale à sa probabilité de devenir un jour le seul allèle restant. À proportions initiales égales, les grandes populations mettent généralement davantage de générations à atteindre ce stade. Les résultats et les durées varient d’une expérience à l’autre.

## Le modèle

La population reste composée de N canards. Les 2N copies du gène de la génération suivante sont tirées indépendamment, avec remise, parmi celles de la génération précédente. Certains parents et certaines copies contribuent donc plusieurs fois, tandis que d’autres ne contribuent pas du tout. Les deux copies peuvent provenir du même parent ; les sexes ne sont pas représentés. Il n’y a ni sélection, ni mutation, ni migration. La nage, les cœurs et le décor n’influencent pas les tirages. En accéléré, les accouplements ne sont pas montrés, mais toutes les générations sont calculées.

Il s’agit d’une animation pédagogique et ludique fondée sur un modèle neutre diploïde de Wright–Fisher, et non d’un logiciel de recherche validé ou d’une représentation réaliste de la reproduction des canards.

[Hypothèses détaillées et validation, en anglais](MODEL.md) · [Étude d’une famille, en anglais](MOTION.md)

## Pour contribuer

Les règles numériques se trouvent dans `model.js` ; `pond-scene.js` et `duck-character.js` dessinent la mare ; `drift.js` gère la lecture et les graphiques principaux ; `replicates.js` gère la comparaison entre mares. Le contenu de la page vient d’`illustration.html`.

Depuis la racine du dépôt, exécutez `python3 scripts/build_pages.py` pour générer les deux langues. Les traductions françaises se trouvent dans `content/locales/fr.json` ; les fichiers produits dans `fr/` ne doivent pas être modifiés directement. La commande `node --test tests/*.test.cjs` vérifie la transmission des copies et le cycle des générations.
