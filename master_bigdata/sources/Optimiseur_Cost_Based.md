# L'Optimiseur Basé sur les Coûts (Cost-Based Optimizer - CBO)

## Qu'est-ce qu'un CBO ?
Dans les systèmes de gestion de bases de données relationnelles (SGBDR) et les moteurs Big Data, l'optimiseur de requêtes est le composant chargé de déterminer la manière la plus efficace d'exécuter une requête SQL. 

L'**Optimiseur Basé sur les Coûts (CBO)** évalue plusieurs plans d'exécution possibles pour une requête donnée et attribue un "coût" estimé à chacun. Il choisit ensuite le plan ayant le coût le plus bas. Ce coût est généralement une mesure abstraite représentant l'utilisation des ressources (I/O disque, temps CPU, utilisation de la mémoire, et parfois le réseau dans les systèmes distribués).

Il s'oppose à l'ancien modèle, l'**Optimiseur Basé sur les Règles (RBO)**, qui appliquait des règles heuristiques strictes (ex: "toujours utiliser un index s'il existe") sans tenir compte de la distribution réelle des données.

## Comment ça marche ? (Le processus d'optimisation)

1. **Analyse et Transformation (Parsing & Rewrite) :**
   La requête SQL est analysée syntaxiquement et sémantiquement, puis transformée en une représentation interne (arbre relationnel). Des simplifications logiques sont appliquées (ex: élimination de conditions redondantes, *predicate pushdown*).

2. **Génération des Plans (Plan Generation) :**
   Le CBO génère un ensemble de plans d'exécution alternatifs. Cela inclut :
   - Différents chemins d'accès (ex: *Full Table Scan* vs *Index Scan*).
   - Différents algorithmes de jointure (ex: *Nested Loop*, *Hash Join*, *Sort-Merge Join*).
   - Différents ordres de jointure (ex: joindre A et B puis C, ou B et C puis A).

3. **Estimation des Coûts (Cost Estimation) :**
   Pour chaque plan généré, le CBO calcule un coût estimé en s'appuyant sur le **Modèle de Coût** et les **Statistiques** de la base de données.

4. **Sélection du Plan (Plan Selection) :**
   Le plan avec le coût total estimé le plus bas est sélectionné et transmis au moteur d'exécution.

## Les Composants Clés du CBO

### 1. Les Statistiques (Le carburant du CBO)
Le CBO est aveugle sans statistiques à jour. Il utilise les métadonnées collectées sur les tables et les index pour estimer la **cardinalité** (le nombre de lignes retournées par chaque opération) :
- **Sur les tables :** Nombre total de lignes, nombre de blocs/pages, taille moyenne des lignes.
- **Sur les colonnes :** Nombre de valeurs distinctes (NDV), valeurs min/max, nombre de valeurs nulles.
- **Histogrammes :** Utilisés pour comprendre la distribution des données (très important pour les données asymétriques ou *skewed data*).
- **Sur les index :** Profondeur de l'arbre B-Tree, nombre de feuilles.

### 2. Le Modèle de Coût (Cost Model)
C'est l'ensemble des formules mathématiques utilisées pour estimer le coût d'une opération. Il prend en compte :
- Le coût des I/O (lecture séquentielle vs lecture aléatoire).
- Le coût CPU (comparaison de valeurs, hachage, tri).
- Le coût de communication réseau (crucial dans les environnements Big Data comme Spark ou Hadoop lors des *shuffles*).

### 3. L'Espace de Recherche (Search Space)
Pour une requête complexe avec de nombreuses jointures, le nombre de plans possibles explose de manière combinatoire (factorielle). Le CBO utilise des algorithmes (comme la programmation dynamique ou des algorithmes gloutons) pour élaguer l'espace de recherche et trouver un "bon" plan rapidement sans avoir à évaluer toutes les combinaisons possibles.

## Exemples de décisions prises par le CBO

- **Choix de l'index :** Si une requête filtre sur `statut = 'ACTIF'` et que ce statut représente 90% de la table, le CBO choisira un *Full Table Scan* plutôt qu'un *Index Scan* (car lire l'index puis faire des accès aléatoires à la table pour 90% des lignes coûte plus cher en I/O). Si le statut représente 1% de la table, il utilisera l'index.
- **Ordre de jointure :** Le CBO essaiera toujours de joindre les tables de manière à réduire la taille du résultat intermédiaire le plus tôt possible (en appliquant les filtres les plus sélectifs en premier).
- **Type de jointure :** 
  - Petites tables : *Nested Loop Join* (ou *Broadcast Hash Join* en Big Data).
  - Grosses tables non triées : *Hash Join*.
  - Grosses tables déjà triées sur la clé de jointure : *Sort-Merge Join*.

## Avantages et Inconvénients

**Avantages :**
- S'adapte dynamiquement à la réalité des données (volumétrie, distribution).
- Trouve des plans d'exécution beaucoup plus performants pour les requêtes complexes que les approches basées sur des règles.

**Inconvénients :**
- **Inconvénient majeur : La fraîcheur des statistiques.** Le CBO est "aveugle" et prend ses décisions *uniquement* sur la base des statistiques qu'on lui fournit. Si les données changent (insertions massives, suppressions, mises à jour) mais que les statistiques ne sont pas recalculées (via une commande comme `ANALYZE TABLE`), le CBO va se baser sur une vision obsolète de la base de données. 
  - *Conséquence :* Il peut choisir un plan d'exécution catastrophique (ex: faire un *Nested Loop Join* en pensant qu'une table fait 10 lignes alors qu'elle en fait désormais 10 millions, ce qui va saturer la mémoire ou prendre des heures au lieu de quelques secondes avec un *Hash Join*).
- **Overhead (Surcoût) :** L'optimisation elle-même prend du temps (CPU/Mémoire). C'est pourquoi les SGBD mettent souvent en cache les plans d'exécution (*Plan Cache*) pour les requêtes récurrentes.
