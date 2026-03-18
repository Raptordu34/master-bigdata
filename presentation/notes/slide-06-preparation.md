# 06 — Phase Offline : Préparation du système

> La phase offline construit toute la base de connaissances spécialisée avant que la première requête utilisateur n'arrive : catalogage des sources et outils, mapping keyword→API, fine-tuning du Domain LLM (avec RLHF ou DPO), et génération des embeddings vectoriels.

---

## Ce que dit la slide

**Titre :** Phase Offline — Préparation du système (§2.2)

Les 6 étapes de la préparation :

1. **Data Source Collection** — inventaire des BDD, APIs, outils disponibles
2. **Tool / Model Collection** — catalogage des modèles spécialisés et opérateurs
3. **Keyword–API Mapping** — association mots-clés ↔ outils via LLM
4. **Domain LLM Training** — fine-tuning sur les outils et schémas métier
5. **LLM Alignment** — alignement instruction-following (RLHF / DPO)
6. **Vector Data Generation** — embedding des connaissances dans la Vector DB

**But :** construire une base de connaissances spécialisée *avant* toute requête utilisateur. La Vector DB joue le rôle de cache sémantique : elle évite de recalculer ce qui a déjà été appris ou résolu.

---

## Concepts clés expliqués

### Étape 1 : Data Source Collection

L'inventaire des sources de données disponibles est la première étape, analogue à l'établissement d'un catalogue de bibliothèque avant d'ouvrir au public.

**Ce qui est catalogué :**
- Schémas de bases de données (tables, colonnes, types, contraintes, clés étrangères)
- APIs disponibles avec leurs signatures (paramètres d'entrée, format de sortie, exemples d'appel)
- Métriques de monitoring exposées (Prometheus, Datadog, etc.)
- Formats de logs (access logs, error logs, slow query logs)
- Données historiques d'incidents et leur résolution

**Pourquoi c'est critique :** Sans catalogue exhaustif, le Domain LLM ne peut pas apprendre quels outils existent, et le Keyword→API Mapping ne peut pas être construit. Le catalogue est la fondation de tout le reste.

### Étape 2 : Tool / Model Collection

Au-delà des sources de données brutes, LLMDB catalogues les **outils** (fonctions, scripts, opérateurs) et **modèles ML spécialisés** disponibles.

**Exemples d'outils :**
- `get_cpu_metrics(host, time_range)` → retourne l'historique CPU
- `get_slow_queries(threshold_ms)` → retourne les requêtes SQL dépassant un seuil
- `run_explain(query)` → retourne le plan d'exécution d'une requête
- `pandas.DataFrame.groupby()` → agrégation de données tabulaires

**Exemples de modèles spécialisés :**
- Modèle de détection d'anomalies sur les séries temporelles CPU/mémoire
- Modèle de classification de type d'incident (hardware, logiciel, surcharge)
- Modèle de prédiction de charge (LSTM, Prophet)

Chaque outil et modèle est documenté avec sa description textuelle — c'est cette description qui sera utilisée dans le Keyword→API Mapping.

### Étape 3 : Keyword–API Mapping

**Problème :** L'utilisateur exprime sa requête en langage naturel. Le système doit la traduire en appels d'API concrets. Comment établir cette correspondance de manière semi-automatique ?

**Approche LLMDB :** Utiliser le General LLM pour générer des associations (mots-clés, synonymes) → (API, outil) à partir des descriptions textuelles des outils.

```
Description outil : "get_cpu_metrics(host, time_range) - Retourne l'historique CPU
                     d'un host sur une période donnée."

LLM génère : {
  "CPU": get_cpu_metrics,
  "charge processeur": get_cpu_metrics,
  "utilisation CPU": get_cpu_metrics,
  "load": get_cpu_metrics,
  "processor usage": get_cpu_metrics
}
```

Ce mapping est stocké dans la Vector DB sous forme d'embeddings, permettant une recherche sémantique lors de l'inférence (si un mot-clé inconnu apparaît, sa similarité cosinus avec les mots-clés connus permet quand même d'identifier le bon outil).

### Étape 4 : Domain LLM Training (fine-tuning)

**Pré-entraînement vs Fine-tuning :**

Le **pré-entraînement** (pre-training) est la phase initiale d'entraînement d'un LLM sur un corpus généraliste massif (par ex. Common Crawl, GitHub, Pile). Cette phase est extrêmement coûteuse (millions de dollars, semaines de calcul sur des milliers de GPU) et est réalisée une fois par les grandes organisations (OpenAI, Meta, Google, Anthropic).

Le **fine-tuning** réutilise un modèle pré-entraîné et continue l'entraînement sur un corpus spécialisé plus petit. Les avantages :
- Beaucoup plus économique (quelques heures à quelques jours sur quelques GPU)
- Permet d'adapter le modèle à un domaine sans repartir de zéro
- Le modèle conserve ses capacités générales tout en gagnant en précision sur le domaine

**Données d'entraînement pour le Domain LLM :**
- Paires (requête NL, pipeline d'exécution attendu) annotées manuellement ou semi-automatiquement
- Exemples d'incidents historiques avec cause identifiée et résolution
- Documentation des APIs transformée en paires (description NL, appel API)
- Requêtes SQL annotées avec leurs résultats et explications

**PEFT / LoRA (Parameter-Efficient Fine-Tuning / Low-Rank Adaptation) :**

Le fine-tuning complet (full fine-tuning) modifie tous les poids du modèle, ce qui est encore coûteux pour des modèles de plusieurs milliards de paramètres. Les méthodes PEFT n'adaptent qu'un sous-ensemble des paramètres.

**LoRA (Hu et al., 2022)** est la méthode PEFT la plus populaire :

Principe : pour chaque matrice de poids W ∈ R^(d×k) du modèle, on n'entraîne pas W directement. On ajoute deux matrices de faible rang A ∈ R^(d×r) et B ∈ R^(r×k) avec r << min(d, k).

```
W_adapté = W_original + αBA
```

Où α est un facteur d'échelle et r est le rang (typiquement 4-64). Seuls A et B sont entraînables (quelques millions de paramètres vs des milliards pour le modèle complet).

**Avantages de LoRA :**
- Réduction de 10000x du nombre de paramètres entraînables
- Possibilité de stocker plusieurs adaptateurs (un par domaine ou tâche)
- Basculement rapide entre adaptateurs à l'inférence
- Compatible avec la quantification (QLoRA)

### Étape 5 : LLM Alignment — RLHF et DPO

**Problème de l'alignement :** Un modèle fine-tuné sur des paires (requête, réponse) apprend à imiter les réponses d'entraînement, mais pas nécessairement à suivre des instructions de manière fiable et sûre. L'alignement (instruction-following) est l'étape supplémentaire pour rendre le modèle *coopératif*.

**RLHF (Reinforcement Learning from Human Feedback) :**

Processus en 3 phases :
1. **Supervised Fine-Tuning (SFT)** : fine-tuner sur des démonstrations de haute qualité annotées par des humains
2. **Reward Model Training** : entraîner un modèle de récompense sur des préférences humaines (humain compare deux réponses et choisit la meilleure)
3. **RL Optimization (PPO)** : optimiser le LLM pour maximiser la récompense prédite par le reward model, sous contrainte de ne pas trop s'éloigner du modèle SFT (KL divergence penalty)

```
LLM → génère réponse A et réponse B → humain préfère A
Reward Model apprend : score(A) > score(B)
RL (PPO) : ajuste LLM pour générer plus de réponses comme A
```

RLHF est coûteux en annotations humaines et instable à entraîner (PPO est sensible aux hyperparamètres).

**DPO (Direct Preference Optimization, Rafailov et al., 2023) :**

DPO est une alternative à RLHF sans modèle de récompense séparé. L'intuition : on peut reformuler l'objectif RLHF directement comme un problème de classification sur des paires de préférences.

L'objectif DPO :
```
L_DPO(π_θ) = -E[(y_w, y_l)] [ log σ(β * log(π_θ(y_w|x)/π_ref(y_w|x)) - β * log(π_θ(y_l|x)/π_ref(y_l|x))) ]
```

Où y_w est la réponse préférée, y_l la réponse non-préférée, π_ref le modèle de référence (SFT), et β un hyperparamètre de régularisation.

**Avantages de DPO vs RLHF :**

| Critère | RLHF (PPO) | DPO |
|---|---|---|
| Modèle de récompense | Requis (entraîné séparément) | Non requis |
| Stabilité | Moins stable (PPO instable) | Plus stable |
| Coût de calcul | Élevé | Plus faible |
| Complexité d'implémentation | Haute | Modérée |
| Performance | SOTA historique | Comparable à RLHF |

Dans LLMDB, l'alignement vise à rendre le Domain LLM capable de suivre des instructions précises du type "génère un pipeline de diagnostic pour cette alerte" de manière fiable et reproductible.

### Étape 6 : Vector Data Generation

**Processus d'embedding :**

1. **Collecte des textes à indexer :** Documentation des outils, incidents historiques annotés, requêtes résolues, résultats de pipelines, règles de réécriture SQL...
2. **Découpage en chunks** : segmentation des textes longs en morceaux de taille adaptée (typiquement 256-512 tokens), avec chevauchement (overlap) pour ne pas couper du contexte important
3. **Encodage** : chaque chunk est passé dans un modèle d'embedding (sentence-transformers/all-MiniLM-L6-v2, OpenAI text-embedding-ada-002, etc.)
4. **Indexation** : les vecteurs sont stockés dans la Vector DB avec leur texte source (métadonnées) et indexés pour la recherche de voisins approchés (ANN)

**Choix du modèle d'embedding :**

| Modèle | Dimension | Avantages |
|---|---|---|
| sentence-transformers/all-MiniLM-L6-v2 | 384 | Léger, open source, rapide |
| text-embedding-3-small (OpenAI) | 1536 | Très bon rapport qualité/coût |
| text-embedding-ada-002 (OpenAI) | 1536 | Référence historique |
| E5-large (Microsoft) | 1024 | Fort pour le retrieval |

**Ce qui est indexé dans LLMDB :**
- Descriptions d'outils et APIs (pour le Keyword→API Mapping)
- Incidents historiques avec leur cause et résolution (pour le diagnostic)
- Requêtes analytiques passées avec leurs pipelines (pour le cache sémantique analytics)
- Règles de réécriture SQL extraites de manuels (pour la slide 10)

---

## Pour aller plus loin

- La phase d'inférence qui utilise ce qui a été préparé : [voir slide 07](slide-07-inference.md)
- Application concrète au diagnostic : [voir slide 08](slide-08-diagnostic.md)
- Le cache sémantique en action pour l'analytics : [voir slide 09](slide-09-analytics.md)

---

## Questions d'examen possibles

1. **Définition :** Expliquez LoRA. Pourquoi permet-il de fine-tuner un LLM avec beaucoup moins de paramètres ?
2. **Comparaison :** Comparez RLHF et DPO. Quels sont les avantages de DPO sur RLHF ?
3. **Processus :** Décrivez les 6 étapes de la phase offline de LLMDB dans l'ordre, en expliquant l'objectif de chaque étape.
4. **Application :** Comment le Keyword→API Mapping est-il construit, et comment est-il utilisé lors de l'inférence ?
5. **Analyse :** Pourquoi l'étape d'alignement (RLHF/DPO) est-elle nécessaire en plus du fine-tuning supervisé ?
