# 07 — Phase Online : Inférence en temps réel

> La phase online transforme une requête en langage naturel en résultat exploitable via trois étapes séquentielles : Pre-Processor (enrichissement), Request Parser (SRL → pipeline), et Pipeline Executor Agent (exécution avec boucle évaluation/régénération).

---

## Ce que dit la slide

**Titre :** Phase Online — Inférence en temps réel (§2.3)

Les composants de la phase online :

1. **Request Pre-Processor** — mots-clés · intention · dépendances · enrichissement Vector DB
2. **Request Parser** — SRL · mapping opérations · génération du pipeline
3. **Pipeline Executor Agent** — exécution · évaluation · régénération si besoin
4. **Vector DB** — lookup sémantique des connaissances et pipelines mémorisés
5. **Data & Model Management** — appels aux sources de données, outils et modèles spécialisés

**Flux :** Requête NL → Pre-Processor → Parser → Agent → résultat (avec boucle évaluation / régénération)

---

## Concepts clés expliqués

### Request Pre-Processor : extraction de mots-clés et enrichissement

Le Pre-Processor est le premier point d'entrée de la requête. Son rôle est de **préparer** la requête brute en langage naturel pour le parser en y ajoutant du contexte.

**Sous-étapes du Pre-Processor :**

**1. Extraction de mots-clés :** Identifier les termes significatifs dans la requête.

```
Requête : "Calcule la capacité moyenne des hôpitaux de Toronto"
Mots-clés : ["capacité", "moyenne", "hôpitaux", "Toronto"]
```

**2. Détection d'intention :** Classifier le type de requête parmi les cas d'usage supportés (diagnostic, analytics, SQL rewrite, etc.).

```
Intention détectée : DATA_ANALYTICS (filtrage géographique + agrégation statistique)
```

**3. Détection de dépendances :** Identifier si la requête référence des entités qui nécessitent une résolution préalable (ex : "les hôpitaux de Toronto" nécessite de savoir que `hospitals` est la table et `city="Toronto"` est le filtre).

**4. Enrichissement via Vector DB :** Les mots-clés sont convertis en embeddings et comparés (similarité cosinus) avec les connaissances indexées dans la Vector DB pour récupérer :
- Le contexte pertinent (schéma de la table `hospitals`, colonnes disponibles)
- Des exemples similaires résolus précédemment
- Le mapping vers les APIs correspondantes (`filter_by_city`, `compute_mean`)

L'enrichissement transforme la requête de quelques mots en un prompt riche incluant le contexte nécessaire pour une interprétation correcte.

### SRL (Semantic Role Labeling) : qui fait quoi à qui

**Définition :** Le **Semantic Role Labeling** (SRL, étiquetage des rôles sémantiques) est une tâche de NLP (Natural Language Processing) qui consiste à identifier, pour chaque prédicat (verbe ou action) d'une phrase, ses arguments sémantiques et leur rôle.

**Cadre standard (PropBank/VerbNet) :**
- **Agent (Arg0)** : qui réalise l'action
- **Patient/Thème (Arg1)** : sur quoi porte l'action
- **Destination (Arg2)** : vers où / pour qui
- **Modificateurs** : lieu, temps, manière, cause...

**Exemple appliqué à LLMDB :**

```
Phrase : "Calcule la capacité moyenne des hôpitaux situés à Toronto"

Prédicat : CALCULER
  Arg0 (Agent) : [système LLMDB implicite]
  Arg1 (Thème) : "capacité moyenne"
  Arg2 (Source) : "hôpitaux situés à Toronto"

Prédicat : SITUÉS
  Arg1 (Thème) : "hôpitaux"
  Modification de lieu : "à Toronto"
```

**Traduction en opérations :**
```
SRL → opérations abstraites :
  1. FILTER(table=hospitals, condition=city="Toronto")
  2. AGGREGATE(column=capacity, function=MEAN)
```

**Pourquoi SRL plutôt qu'une simple tokenisation ?** SRL capture la structure logique de la requête, pas seulement les mots. "L'hôpital a fermé à Toronto" et "L'hôpital de Toronto a fermé" ont la même structure SRL mais des tokens différents. SRL est plus robuste aux variations de formulation.

### Request Parser : de SRL au pipeline d'exécution

Le **Request Parser** prend la représentation SRL et génère un pipeline d'exécution concret, c'est-à-dire une séquence ordonnée d'appels d'API et d'opérations de données.

**Étapes du Parser :**

1. **Mapping opérations → APIs :** Chaque opération abstraite (FILTER, AGGREGATE) est associée à l'outil concret correspondant via le Keyword→API Mapping de la phase offline

2. **Résolution des paramètres :** Les arguments SRL sont traduits en paramètres d'API concrets :
   ```
   FILTER(table=hospitals, condition=city="Toronto")
   → df_hospitals[df_hospitals['city'] == 'Toronto']
   ```

3. **Ordonnancement** : Déterminer l'ordre d'exécution (certaines opérations ont des dépendances)

4. **Génération du pipeline** : Le résultat est un graphe acyclique dirigé (DAG) d'opérations

```
Pipeline généré pour "capacité moyenne hôpitaux Toronto" :
  Step 1: load_data(source="hospitals_canada.csv")
  Step 2: filter(condition="city == 'Toronto'")
  Step 3: aggregate(column="capacity", function="mean")
  Step 4: format_result(template="La capacité moyenne est de {result} lits")
```

### Pipeline Executor Agent : boucle exécution/évaluation/régénération

C'est le composant le plus innovant de LLMDB. Il exécute le pipeline en maintenant une boucle de contrôle à deux niveaux.

**Niveau 1 : évaluation par étape**

Après chaque étape du pipeline, l'Agent évalue le résultat :
- Le résultat est-il non-vide ? (cas d'un filtre trop strict)
- Le format est-il celui attendu ? (DataFrame vs dictionnaire vs liste)
- Les valeurs sont-elles dans un range plausible ? (vérification de cohérence)
- L'étape a-t-elle généré une erreur d'exécution ?

Si l'évaluation échoue → **régénération ciblée de l'étape** (et de ses dépendances) sans relancer l'ensemble du pipeline.

**Niveau 2 : évaluation du pipeline complet**

Après exécution complète, l'Agent évalue le résultat final :
- La réponse répond-elle à la question initiale ?
- Le résultat est-il cohérent avec la connaissance de domaine ?
- Faut-il reformuler ou compléter la réponse ?

Si l'évaluation globale échoue → régénération d'un sous-pipeline alternatif

**Avantage par rapport aux agents LLM naïfs :**

| Approche | Comportement en cas d'échec |
|---|---|
| LLM seul | Pas de détection, réponse incorrecte présentée comme correcte |
| Agent LLM naïf | Relance l'ensemble du pipeline depuis le début (coûteux) |
| LLMDB Pipeline Agent | Régénère uniquement l'étape défaillante (précis et économique) |

**Mémorisation dans la Vector DB :**

Après une exécution réussie, le pipeline résolu est stocké dans la Vector DB avec l'embedding de la requête originale. Les requêtes futures sémantiquement similaires peuvent récupérer directement ce pipeline et l'adapter si nécessaire, sans passer par le Parser — c'est le cache sémantique au niveau des pipelines.

---

## Pour aller plus loin

- Comment le Pre-Processor s'applique au diagnostic : [voir slide 08](slide-08-diagnostic.md)
- Comment le cache sémantique s'enrichit via l'analytics : [voir slide 09](slide-09-analytics.md)
- La phase offline qui prépare les outils utilisés ici : [voir slide 06](slide-06-preparation.md)

---

## Questions d'examen possibles

1. **Définition :** Qu'est-ce que le Semantic Role Labeling (SRL) ? Donnez un exemple d'application à une requête de type analytics.
2. **Processus :** Décrivez les étapes du Pre-Processor. Pourquoi l'enrichissement via Vector DB est-il critique à cette étape ?
3. **Analyse :** Expliquez la boucle d'évaluation/régénération du Pipeline Executor Agent à deux niveaux. En quoi la régénération ciblée est-elle supérieure à une régénération complète ?
4. **Application :** Tracez le pipeline complet pour la requête "Quel est le taux de remplissage moyen des hôpitaux de Montréal ce mois-ci ?" à travers les 3 composants de la phase online.
5. **Comparaison :** Comparez la gestion d'échec entre un Agent LLM naïf et le Pipeline Executor Agent de LLMDB.
