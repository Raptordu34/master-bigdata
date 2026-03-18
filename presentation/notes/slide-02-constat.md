# 02 — Le constat de départ

> Le ML traditionnel optimise efficacement des tâches isolées sur des bases de données, mais souffre d'un manque de généralisabilité et d'incapacité à raisonner en plusieurs étapes — deux limites que les LLMs semblent pouvoir combler.

---

## Ce que dit la slide

**Titre :** Pourquoi les approches actuelles ne suffisent plus

- Le ML traditionnel est largement utilisé pour optimiser la gestion de données (nettoyage, analytics, diagnostic)
- Mais il souffre de **deux limitations majeures** :
  - **Mauvaise généralisabilité** : un modèle entraîné sur une base de données ne s'adapte pas facilement à une autre (schéma différent, workload différent, hardware différent)
  - **Pas de raisonnement contextuel** : impossible de comprendre une requête ambiguë ou de faire du multi-step reasoning (ex: diagnostic + identification de cause racine)

**Transition :** Les LLMs semblent être une réponse naturelle à ces limites — mais ils ont leurs propres problèmes.

---

## Concepts clés expliqués

### ML traditionnel pour la gestion de bases de données

Depuis les années 2010, le machine learning a été appliqué à de nombreux problèmes de gestion de données :

**OtterTune** (Carnegie Mellon, 2017) : système qui apprend automatiquement le tuning de configuration d'une base de données (PostgreSQL, MySQL). L'idée : observer les métriques de performance (CPU, I/O, latence), ajuster les paramètres de configuration (par ex. `shared_buffers`, `work_mem`), et converger vers une configuration optimale via des algorithmes d'apprentissage par renforcement ou gaussien.

**Bao** (Brown University, 2021) : système d'optimisation de plans d'exécution SQL. Le query planner classique d'un SGBD génère un plan d'exécution basé sur des statistiques (nombre de tuples, cardinalité des jointures). Bao apprend, par renforcement, à choisir le meilleur plan parmi les hints possibles, en observant les temps d'exécution réels.

D'autres exemples :
- **Learned index structures** (Kraska et al., 2018) : remplacer les B-trees par des modèles ML
- **Learned cardinality estimation** : prédire la taille des résultats intermédiaires de jointures
- **Naru/NeuroCard** : estimation de cardinalité par autoencodeurs sur des schémas de données

### Distribution shift (décalage de distribution)

Le **distribution shift** est l'un des problèmes fondamentaux du machine learning appliqué :

**Définition formelle :** Un modèle est entraîné sur une distribution P(X, Y) et déployé sur une distribution Q(X, Y). Si P ≠ Q, les performances se dégradent.

**En gestion de bases de données**, le shift peut survenir sur plusieurs axes :

| Dimension | Exemple de shift |
|---|---|
| Schéma | PostgreSQL → MySQL (types de données, syntaxe, comportement des index) |
| Workload | OLTP (transactions courtes) → OLAP (requêtes analytiques longues) |
| Hardware | SSD NVMe → HDD rotatif (profil I/O radicalement différent) |
| Volume | 1 M tuples en entraînement → 1 B tuples en production |
| Temporalité | Distribution des requêtes change avec les saisons (e-commerce, finance) |

Un modèle OtterTune entraîné sur PostgreSQL en OLTP ne produira pas de bonnes recommandations pour MySQL en OLAP. La réentraîner sur chaque nouveau système est coûteux.

**Transfer learning comme réponse partielle :** Le transfer learning (fine-tuner un modèle pré-entraîné sur une tâche source vers une tâche cible) atténue le problème mais ne le résout pas complètement. Il faut toujours des données étiquetées de la tâche cible, qui sont souvent rares et coûteuses à collecter.

### Multi-step reasoning (raisonnement multi-étapes)

Le **raisonnement multi-étapes** désigne la capacité d'enchaîner plusieurs inférences causales pour arriver à une conclusion.

**Exemple concret :** Face à une alerte `NodeLoadHigh` :
1. Observer que le CPU est à 159 % → surcharge
2. Identifier que les processus les plus consommateurs sont liés au moteur de stockage
3. Croiser avec les logs pour voir qu'une série d'opérations DDL (CREATE INDEX, DROP INDEX) est en cours sur les mêmes tables
4. Conclure que ces opérations causent une reconstruction répétée d'index
5. Recommander de suspendre les opérations de maintenance DDL et d'optimiser le planning

Un modèle de classification ML classique peut apprendre l'association symptôme → label, mais pas enchaîner ces cinq étapes de manière générique. Chaque étape requiert un modèle séparé, et l'assemblage est fragile.

**Analogie cognitive :** Le raisonnement multi-étapes est ce qui distingue la résolution d'une équation linéaire (une étape) d'un problème de géométrie analytique (plusieurs étapes, chacune dépendant de la précédente).

### Pourquoi les LLMs semblent une réponse naturelle

Les LLMs (Large Language Models), entraînés sur de vastes corpus incluant documentation technique, forums de DBA, papiers de recherche, sont capables en principe :
- de **généraliser** : ils ont vu de nombreux systèmes différents dans leurs données d'entraînement
- de **raisonner en chaîne** : via les techniques de chain-of-thought (Wei et al., 2022), ils peuvent décomposer un problème en sous-étapes

Mais cette capacité n'est pas sans limites — c'est l'objet de la slide 3.

---

## Pour aller plus loin

- Les limites des LLMs seuls sont détaillées dans la slide suivante : [voir slide 03](slide-03-limitations-llm.md)
- OtterTune et Bao sont implicitement les systèmes que LLMDB cherche à dépasser ; le tableau comparatif de la slide 4 formalise cette comparaison : [voir slide 04](slide-04-llmdb.md)

---

## Questions d'examen possibles

1. **Définition :** Qu'est-ce que le distribution shift ? Donnez un exemple concret dans le contexte des bases de données.
2. **Application :** Pourquoi OtterTune ne peut-il pas simplement être déployé tel quel sur un nouveau type de SGBD ?
3. **Comparaison :** En quoi le multi-step reasoning est-il un défi fondamentalement différent du problème de généralisation ?
4. **Analyse :** Le transfer learning est-il une solution suffisante au distribution shift pour la gestion de données ? Justifiez.
5. **Synthèse :** Quels sont les deux problèmes fondamentaux du ML traditionnel pour la gestion de données, et comment les LLMs sont-ils supposés les adresser ?
