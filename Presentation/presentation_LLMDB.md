# LLM-Enhanced Data Management — Plan de présentation (20 min)

---

## Slide 1 — Titre & Accroche (1 min)

**Titre :** LLM-Enhanced Data Management
**Sous-titre :** Un nouveau paradigme pour la gestion de données augmentée par les LLMs
**Source :** Xuanhe Zhou, Xinyang Zhao, Guoliang Li — Tsinghua University, arXiv Feb 2024

**Accroche orale :**
> "Et si on pouvait diagnostiquer une base de données, analyser un dataset ou optimiser une requête SQL… juste en le décrivant en langage naturel ?"

---

## Slide 2 — Le constat de départ (2 min)

**Titre :** Pourquoi les approches actuelles ne suffisent plus

- Le ML traditionnel est largement utilisé pour optimiser la gestion de données (nettoyage, analytics, diagnostic)
- Mais il souffre de **deux limitations majeures** :
  - **Mauvaise généralisabilité** : un modèle entraîné sur une base de données ne s'adapte pas facilement à une autre (schéma différent, workload différent, hardware différent)
  - **Pas de raisonnement contextuel** : impossible de comprendre une requête ambiguë ou de faire du multi-step reasoning (ex: diagnostic + identification de cause racine)

**Transition orale :**
> "Les LLMs semblent être une réponse naturelle à ces limites — ils généralisent bien et comprennent le contexte. Mais ils ont leurs propres problèmes."

---

## Slide 3 — Le problème avec les LLMs seuls (2 min)

**Titre :** 3 limitations critiques des LLMs

1. **Hallucination** : les LLMs génèrent des réponses plausibles mais factuellement fausses, surtout sur des données de domaine spécifique (schémas de BDD, métriques système)
2. **Coût élevé** : appeler un LLM général pour chaque requête utilisateur est prohibitif à l'échelle
3. **Faible précision sur tâches complexes** : les tâches multi-étapes (ex: pipeline de diagnostic) nécessitent une stabilité que les LLMs seuls ne garantissent pas

**Il existe des approches basées sur des agents LLM** (chains of thought, tool calling) mais elles restent instables et coûteuses.

**Transition orale :**
> "Il nous faut un nouveau paradigme qui tire parti des LLMs tout en compensant leurs limites. C'est ce que nous proposons avec LLMDB."

---

## Slide 4 — Notre proposition : LLMDB (2 min)

**Titre :** LLMDB — Un framework LLM-enhanced pour la gestion de données

**Tableau comparatif :**

|                | LLM seul | Agent LLM | **LLMDB** |
|----------------|----------|-----------|-----------|
| Task-Solving   | Moyen    | Moyen     | **Élevé** |
| Stabilité      | Bas      | Moyen     | **Élevé** |
| Coût           | Élevé    | Élevé     | **Bas**   |
| Efficacité     | Moyen    | Bas       | **Moyen** |

**Les 3 idées-forces de LLMDB :**
- **Domain knowledge embedding** → résout l'hallucination (fine-tuning + vector DB)
- **Vector DB as cache** → réduit le coût (on évite d'appeler le LLM quand la réponse est déjà connue)
- **Pipeline agent** → améliore la précision sur tâches complexes (exécution multi-étapes, évaluation, re-génération)

---

## Slide 5 — Architecture LLMDB (3 min)

**Titre :** Les 5 composants de LLMDB

**Composants :**
1. **General LLM** — compréhension générale et raisonnement
2. **Domain-specific LLM** — fine-tuné sur les données du domaine → réduit l'hallucination
3. **LLM Executor Agent** — orchestre des pipelines d'opérations complexes
4. **Vector Database** — fournit recherche sémantique, cache intelligent, connaissance temps-réel
5. **Data Source Manager** — pont entre les pipelines et les sources de données / outils / modèles

**Deux phases de fonctionnement :**

**Offline Preparation** *(on prépare à l'avance)* :
- Collecte des sources de données
- Fine-tuning des LLMs de domaine
- Génération des embeddings vectoriels
- Mapping keyword → API

**Online Inference** *(pour chaque requête)* :
1. **Request Pre-processor** : reconnaissance des mots-clés, identification de l'intention, enrichissement contextuel
2. **Request Parser** : segmentation sémantique → opérations API + opérations data → pipeline d'exécution
3. **Pipeline Executor Agent** : raffine le pipeline, l'évalue, le re-génère si le résultat est insuffisant

---

## Slide 6 — Cas d'usage 1 : Diagnostic de base de données (2.5 min)

**Titre :** LLMDB pour le diagnostic système — "Mon CPU est à 159%"

**Scénario :** Une alerte système arrive : `NodeLoadHigh`. La charge CPU dépasse la capacité totale.

**Ce que fait LLMDB :**
1. **Enrichissement du contexte** : l'alerte est complétée avec la durée de la surcharge, les processus consommateurs, les requêtes lentes en cours
2. **Génération du pipeline** (fixe pour le diagnostic) :
   - Analyse de métriques
   - Analyse d'activité (logs)
   - Matching avec la base de connaissance (incidents historiques similaires)
   - Recommandation de solution
3. **Résultat** : *"La cause est une série de créations et suppressions d'index répétées sur les mêmes tables"*

**Ce qui change vs ML classique :**
- Pas besoin de labelliser des milliers d'incidents
- S'adapte à des métriques inconnues au moment de l'entraînement
- Fournit une explication en langage naturel, pas juste un label de classification

---

## Slide 7 — Cas d'usage 2 : Data Analytics en langage naturel (2.5 min)

**Titre :** LLMDB pour l'analytics — interroger des données sans écrire de code

**Scénario :** Un utilisateur non-technicien veut analyser un dataset d'hôpitaux canadiens :
> "Calcule la capacité moyenne des hôpitaux situés à Toronto."

**Ce que fait LLMDB :**
1. **Préparation** : chargement et nettoyage des données tabulaires (standardisation des dates, suppression des doublons via Pandas)
2. **Parsing** : la requête NL est traduite en un pipeline d'opérations API (filtrage par ville → calcul de moyenne)
3. **Génération de code** : production d'un script Pandas exécutable
4. **Résultat** : `La capacité moyenne des hôpitaux de Toronto est de 483 lits`

**Bonus — apprentissage par cache :**
- La requête et son embedding sont stockés dans la vector DB
- Une requête similaire future sera directement résolue sans appel LLM
- Le système s'améliore progressivement avec l'usage

---

## Slide 8 — Cas d'usage 3 : Query Rewrite (2 min)

**Titre :** LLMDB pour l'optimisation SQL — réécriture automatique de requêtes

**Le problème :** Une requête SQL correcte peut être inefficace. La réécrire manuellement requiert une expertise avancée.

**Ce que fait LLMDB :**
1. **Extraction de règles** : à partir de manuels de bases de données et de papiers de recherche, le LLM extrait automatiquement des règles de réécriture (ex: `AggregateFilterTransposeRule`, `FilterProjectTransposeRule`)
2. **Application des règles** : l'agent sélectionne les règles applicables à la requête cible et génère des candidats réécrits
3. **Évaluation** : chaque réécriture est validée sur deux critères :
   - Équivalence sémantique (même résultat ?)
   - Coût d'exécution estimé (plus efficace ?)
4. **Résultat** : la réécriture optimale est sélectionnée

**Exemple :** Une requête avec subquery imbriquée est transformée en version `LATERAL` — sémantiquement équivalente, mais moins coûteuse à l'exécution.

---

## Slide 9 — Défis & Questions ouvertes (2 min)

**Titre :** Ce qu'il reste à résoudre — un programme de recherche

**Défis transversaux :**
- **Fine-tuning vs prompt engineering** : fine-tuner nécessite beaucoup de données de qualité ; prompter nécessite des prompts à chaque requête. Quel équilibre ?
- **Intégration des experts humains** : comment intégrer les retours d'un DBA dans la boucle d'amélioration continue ?

**Défis spécifiques par use case :**
- *Diagnostic* : comment traiter des données multimodales (images de monitoring, logs non structurés) ?
- *Analytics* : comment générer du code fiable pour des formats de données très hétérogènes ?
- *Query Rewrite* : comment vérifier formellement l'équivalence sémantique entre deux requêtes SQL complexes ?

**Transition orale :**
> "C'est pourquoi ce papier est qualifié de 'Vision' — il pose les bases d'un programme de recherche, pas d'un système finalisé."

---

## Slide 10 — Conclusion (1 min)

**Titre :** Ce qu'il faut retenir

**3 idées-forces :**
1. **Domain-specific LLM + vector DB** → résout l'hallucination et réduit le coût
2. **Pipeline agent** → permet d'attaquer des tâches complexes de manière fiable et évaluable
3. **Un framework générique** → applicable à des domaines variés : diagnostic, analytics, query rewrite

**Impact potentiel :**
- Rend la gestion de données accessible aux non-experts (langage naturel)
- Automatise des tâches qui nécessitent aujourd'hui une expertise DBA
- Code source disponible : `github.com/TsinghuaDatabaseGroup/DB-GPT`

**Question ouverte pour la discussion :**
> "Dans quelle mesure peut-on faire confiance à un LLM pour des décisions critiques sur une base de données de production ?"

---

## Minutage récapitulatif

| Slide | Contenu | Durée |
|-------|---------|-------|
| 1 | Titre & Accroche | 1 min |
| 2 | Constat de départ | 2 min |
| 3 | Limitations des LLMs | 2 min |
| 4 | Proposition LLMDB | 2 min |
| 5 | Architecture | 3 min |
| 6 | Cas 1 : Diagnostic | 2.5 min |
| 7 | Cas 2 : Analytics | 2.5 min |
| 8 | Cas 3 : Query Rewrite | 2 min |
| 9 | Défis & Perspectives | 2 min |
| 10 | Conclusion | 1 min |
| **Total** | | **20 min** |
