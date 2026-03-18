# 11 — Défis & Questions ouvertes

> Ce papier est un vision paper : il pose les bases d'un programme de recherche plutôt que de présenter un système finalisé. Les défis transversaux (fine-tuning vs prompting, Human-in-the-Loop) et spécifiques à chaque cas d'usage restent des questions ouvertes.

---

## Ce que dit la slide

**Titre :** Ce qu'il reste à résoudre

**Défis transversaux :**
- **Fine-tuning vs prompt engineering** : quel équilibre ?
- **Intégration des experts humains** : comment intégrer les retours d'un DBA ?

**Défis par cas d'usage :**
- *Diagnostic* : données multimodales (images, logs non structurés)
- *Analytics* : code fiable pour formats hétérogènes
- *Query Rewrite* : vérification formelle de l'équivalence sémantique

---

## Concepts clés expliqués

### Nature "Vision paper" : programme de recherche

**Qu'est-ce qu'un vision paper ?** [rappel : voir slide 01](slide-01-titre.md)

Un vision paper comme LLMDB ne prétend pas avoir résolu les problèmes qu'il identifie. Il les *cartographie* : il décrit les problèmes, propose une architecture plausible, illustre la faisabilité avec des exemples, et délimite les questions ouvertes pour la communauté de recherche.

**Conséquence pratique :** Plusieurs composants de LLMDB sont esquissés conceptuellement mais pas implémentés complètement dans DB-GPT. En particulier :
- La vérification formelle de l'équivalence SQL est partiellement implémentée (vérification empirique sur échantillon)
- L'alignement RLHF/DPO est décrit mais l'implémentation dans DB-GPT utilise des techniques plus simples
- Le Human-in-the-Loop est une proposition conceptuelle, pas encore un module complet

### Défi transversal 1 : Fine-tuning vs Prompt engineering

**Comparaison détaillée :**

| Critère | Fine-tuning | Prompt engineering |
|---|---|---|
| **Coût initial** | Élevé (données annotées, GPU, temps) | Faible (quelques exemples dans le prompt) |
| **Performance de domaine** | Meilleure (connaissance encodée dans les poids) | Variable (dépend de la qualité du prompt) |
| **Adaptation à un nouveau domaine** | Réentraînement nécessaire | Nouveau prompt suffisant |
| **Coût à l'inférence** | Faible (modèle plus petit) | Élevé (prompt long = tokens supplémentaires) |
| **Données requises** | Milliers de paires annotées | Quelques dizaines d'exemples (few-shot) |
| **Maintenance** | Modèle à maintenir et mettre à jour | Prompt à maintenir et optimiser |
| **Interprétabilité** | Difficile (poids modifiés) | Plus facile (prompt lisible) |

**RAG (Retrieval-Augmented Generation) :**

RAG est une approche hybride qui combine prompt engineering et vector database :

1. La requête utilisateur est encodée en embedding
2. Les N documents les plus similaires sont récupérés de la Vector DB
3. Ces documents sont injectés dans le prompt comme contexte
4. Le LLM génère une réponse en s'appuyant sur ce contexte

```
Requête : "Pourquoi le CPU est-il élevé ?"
Retrieve : top-3 incidents similaires depuis Vector DB
Prompt : "Contexte : [incident1] [incident2] [incident3]. Requête : Pourquoi le CPU est-il élevé ?"
LLM → réponse basée sur le contexte réel
```

**Lien avec LLMDB :** La Vector DB de LLMDB joue le rôle du retriever dans RAG. La différence est que LLMDB va plus loin : le Domain LLM est *fine-tuné* sur les données de domaine (pas seulement informé par un prompt), et le Pipeline Agent structure l'exécution.

**Le bon équilibre :** Il n'existe pas de réponse universelle. La décision dépend de :
- Volume et qualité des données de domaine disponibles
- Budget de calcul pour le fine-tuning
- Fréquence de changement du domaine (domaine stable → fine-tuning rentable)
- Exigences de latence (fine-tuning = modèle plus petit → plus rapide)

### Défi transversal 2 : Human-in-the-Loop

**Définition :** Le **Human-in-the-Loop** (HITL) est une approche où des experts humains interviennent dans la boucle d'apprentissage ou d'exécution du système.

**Pourquoi c'est critique pour LLMDB :**

Les décisions que LLMDB peut prendre (suspendre un index, modifier une configuration, réécrire une requête en production) peuvent avoir des effets irréversibles ou critiques sur une base de données de production. Un LLM, même bien aligné, peut faire des erreurs de jugement que seul un DBA expert peut détecter.

**Implémentations possibles du HITL :**

**Seuils de confiance :**
```
Confiance élevée (> 90%) : action automatique
Confiance moyenne (60-90%) : notification DBA, action sous 5 min si pas de retour
Confiance faible (< 60%) : validation DBA obligatoire avant action
```

**Active learning :**
Le système identifie les cas où il est le moins sûr (les plus éloignés des exemples connus dans la Vector DB) et demande une annotation humaine en priorité. Ces cas annotés sont réintégrés dans la base de connaissances.

**Feedback loop :**
Après chaque action, le DBA peut corriger ou valider la décision du système. Les corrections alimentent le processus de fine-tuning continu.

**Risques des décisions automatisées critiques :**
- Faux positif (action corrective incorrecte) : aggravation du problème
- Effet domino : une modification de configuration peut affecter d'autres requêtes
- Irréversibilité : `DROP INDEX` suivi de `COMMIT` est difficile à annuler sous charge

### Défi spécifique au diagnostic : données multimodales

**Le problème :** Un diagnostic de BDD complet nécessite des données de formats très différents :

| Format | Exemple | Difficulté |
|---|---|---|
| Métriques numériques | CPU 159%, I/O 78% | Structuré, facile |
| Logs textuels | `ERROR: deadlock detected between transactions` | Semi-structuré, parseable |
| Graphes de performance | Courbes temporelles (flamegraphs, traces) | Image, difficile pour LLMs |
| Schémas de BDD | Diagrammes ER | Image + texte |
| Traces de requêtes | Arbres d'exécution imbriqués | Structuré complexe |

**Les LLMs actuels** sont principalement entraînés sur du texte. Les modèles multimodaux (GPT-4V, Gemini) peuvent traiter des images, mais leur précision sur des graphes techniques (flamegraphs, timeseries) est encore limitée.

**Piste de recherche :** Convertir les données graphiques en représentations textuelles (ex. sérialiser une courbe temporelle en valeurs numériques, décrire un flamegraph en texte) avant de les soumettre au LLM.

### Défi spécifique à l'analytics : hétérogénéité des formats

**Le problème :** Les données réelles sont rarement propres. Un dataset d'hôpitaux canadiens peut contenir :

```
hospital_name : "St. Michael's Hospital", "st michael hospital", "Saint Michael's"
capacity : "450", "450 lits", "450 beds", null, "-"
date : "2023-01-15", "15/01/2023", "Jan 15 2023", "01-15-23"
```

Le nettoyage automatique par le Domain LLM doit détecter ces variations sans supervision — et parfois prendre des décisions ambiguës ("450 lits" et "450 beds" sont équivalents, mais "450" pourrait être en milliers dans un autre contexte).

**Approche LLMDB :** Le Domain LLM génère du code de nettoyage Pandas basé sur l'analyse du schéma et d'un échantillon des données. Mais pour des cas ambigus, un mécanisme de clarification (HITL) est nécessaire.

### Défi spécifique au SQL rewrite : vérification formelle

Ce défi est détaillé dans [la slide 10](slide-10-sql-rewrite.md). En résumé :

La vérification formelle complète de l'équivalence SQL est NP-hard. Les cas problématiques (NULL, DISTINCT, fonctions non-déterministes, triggers, vues matérialisées) rendent impossible une garantie formelle universelle.

**Approche pragmatique de LLMDB :** Combiner vérification empirique (exécution sur échantillon de données) et vérification formelle partielle (pour les sous-ensembles de SQL bien définis), avec escalade vers un DBA pour les cas douteux.

---

## Pour aller plus loin

- Fine-tuning vs prompting expliqués en détail : [voir slide 06](slide-06-preparation.md)
- Les limitations des LLMs qui motivent ces défis : [voir slide 03](slide-03-limitations-llm.md)
- La vision d'ensemble du papier et sa nature de programme de recherche : [voir slide 01](slide-01-titre.md)

---

## Questions d'examen possibles

1. **Comparaison :** Comparez fine-tuning et RAG comme approches pour réduire l'hallucination sur des données de domaine. Quand préférer l'un sur l'autre ?
2. **Analyse :** Qu'est-ce que le Human-in-the-Loop ? Quels mécanismes concrets permettent de l'implémenter dans LLMDB ?
3. **Application :** Donnez un exemple de décision LLMDB qui nécessite une validation humaine obligatoire, et un exemple qui peut être automatisé en toute sécurité. Justifiez.
4. **Synthèse :** Pourquoi ce papier est-il qualifié de "Vision" ? Quelles parties du framework sont réellement implémentées vs seulement conceptuelles ?
5. **Problème ouvert :** Expliquez le défi de la vérification formelle pour la réécriture SQL. Quels types de requêtes résistent à la vérification formelle ?
