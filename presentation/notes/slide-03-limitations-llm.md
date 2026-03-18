# 03 — Le problème avec les LLMs seuls

> Les LLMs présentent trois limites critiques pour la gestion de données : hallucination, coût prohibitif à l'échelle, et faible précision sur les tâches multi-étapes — même les approches à base d'agents LLM restent insuffisantes.

---

## Ce que dit la slide

**Titre :** 3 limitations critiques des LLMs

1. **Hallucination** : les LLMs génèrent des réponses plausibles mais factuellement fausses, surtout sur des données de domaine spécifique (schémas de BDD, métriques système)
2. **Coût élevé** : appeler un LLM général pour chaque requête utilisateur est prohibitif à l'échelle
3. **Faible précision sur tâches complexes** : les tâches multi-étapes nécessitent une stabilité que les LLMs seuls ne garantissent pas

Il existe des approches basées sur des agents LLM (chains of thought, tool calling) mais elles restent instables et coûteuses.

---

## Concepts clés expliqués

### Hallucination : mécanisme et types

L'**hallucination** d'un LLM est la génération d'une information incorrecte mais présentée avec confiance. Pour comprendre pourquoi cela se produit, il faut comprendre le mécanisme génératif.

**Mécanisme autorégressif :** Un LLM génère du texte token par token. À chaque étape, il calcule une distribution de probabilité sur le vocabulaire et sélectionne le token suivant (par argmax, sampling, ou beam search). La prédiction du token t+1 dépend des tokens 1..t déjà générés.

```
P(token_t+1 | token_1, ..., token_t)
```

**Conséquence critique :** Le modèle prédit le token le *plus probable* selon ses données d'entraînement, pas nécessairement le *plus vrai*. Si une formulation incorrecte est statistiquement courante dans les données d'entraînement, le modèle la reproduira.

**Types d'hallucination pertinents pour les BDD :**

| Type | Description | Exemple |
|---|---|---|
| Hallucination factuelle | Information inventée ou datée | Noms de tables/colonnes qui n'existent pas dans le schéma cible |
| Hallucination structurelle | SQL syntaxiquement valide mais sémantiquement erroné | `JOIN` sur la mauvaise clé étrangère |
| Hallucination de métriques | Valeurs de référence inexactes | Seuils CPU "normaux" inventés |
| Hallucination de procédure | Étapes de diagnostic dans le mauvais ordre | Recommandation d'action avant identification de cause |

**Pourquoi le domaine spécifique aggrave le problème :** Les données d'entraînement des LLMs généraux (GPT-4, Llama, Claude) incluent beaucoup de documentation générique, mais peu d'incidents de production réels (ils sont confidentiels) et peu de schémas propriétaires. Le modèle a donc moins de "signal factuel" pour les questions de domaine.

**Solution LLMDB :** Fine-tuning sur des données de domaine + vector database pour fournir au modèle le contexte exact (schéma, métriques actuelles, incidents passés). [voir slide 06](slide-06-preparation.md)

### Coût : modèle économique à l'usage

**Modèle économique des LLMs cloud :** OpenAI, Anthropic, Google facturent à l'usage, en comptant les **tokens** (unités lexicales, environ 4 caractères par token en anglais).

**Exemple de coût :**
- GPT-4o (2024) : ~$5 per 1M tokens input, ~$15 per 1M tokens output
- Une requête de diagnostic typique : 1000 tokens input + 500 tokens output ≈ $0.012
- 10 000 requêtes/jour → ~$120/jour → ~$3600/mois pour un seul cas d'usage

**Latence :** Les LLMs de grande taille (GPT-4, Claude 3 Opus) ont une latence de 3-10 secondes par requête. Pour des applications temps réel (monitoring de BDD), c'est inacceptable.

**Solution LLMDB :** Le cache sémantique (vector database) permet de répondre à une requête similaire sans appeler le LLM. Le Domain LLM (plus petit, hébergé localement) est moins coûteux que le General LLM pour les tâches de domaine. [voir slide 04](slide-04-llmdb.md)

### Faible précision sur tâches complexes

**Le problème de la propagation d'erreurs :** Dans un pipeline multi-étapes, une erreur à l'étape k se propage et s'amplifie aux étapes suivantes. Un LLM sans mécanisme de vérification intermédiaire n'a pas accès à ce feedback.

**Absence de mémoire d'état :** Les LLMs sont des fonctions sans état (*stateless*). Chaque appel est indépendant. Pour maintenir un contexte sur plusieurs étapes, il faut passer l'historique complet dans le prompt (coûteux et limité par la fenêtre de contexte) ou utiliser un mécanisme externe de gestion d'état.

**Instabilité :** La génération stochastique (température > 0) signifie que deux appels identiques peuvent produire des résultats différents. Pour une tâche de production (diagnostic, réécriture SQL), cette variabilité est problématique.

### Agents LLM : Chain-of-Thought et ReAct

**Chain-of-Thought (Wei et al., 2022) :** Technique de prompting qui demande au LLM de décomposer son raisonnement étape par étape avant de donner une réponse finale. Améliore significativement la précision sur des tâches arithmétiques et logiques.

```
Prompt naïf : "Quel est le problème avec cette base de données ?"
CoT : "Raisonne étape par étape. D'abord, quelles métriques sont anormales ? Ensuite..."
```

**Tool calling / Function calling :** Permettre au LLM d'appeler des outils externes (APIs, moteurs de calcul, BDD) plutôt que d'inventer des réponses. Réduit l'hallucination factuelle en fournissant des données réelles.

**ReAct (Yao et al., 2023) :** Framework qui alterne **Re**asoning (pensée) et **Act**ion (appel d'outil) dans une boucle. Le modèle observe le résultat de l'outil et adapte son raisonnement.

```
Thought: Je dois vérifier le CPU load
Action: get_metrics(cpu_load, last_5min)
Observation: 159%
Thought: Le CPU est très chargé, je dois identifier les processus responsables
Action: get_top_processes()
...
```

**Limites résiduelles des agents LLM :**
- **Instabilité** : le LLM peut prendre de mauvaises décisions de branchement (quel outil appeler ?)
- **Coût** : chaque étape du pipeline implique un appel LLM → coût multiplicatif
- **Pas d'apprentissage** : sans mécanisme de mémoire persistante, chaque requête repart de zéro

**Ce que LLMDB apporte en plus :** Un Pipeline Executor Agent avec évaluation et régénération ciblée, un cache sémantique pour éviter de recommencer, et un Domain LLM spécialisé pour réduire les erreurs de domaine. [voir slide 07](slide-07-inference.md)

---

## Pour aller plus loin

- La réponse de LLMDB à ces trois limitations est présentée slide 4 : [voir slide 04](slide-04-llmdb.md)
- Le fine-tuning comme solution à l'hallucination est détaillé slide 6 : [voir slide 06](slide-06-preparation.md)
- L'architecture du Pipeline Executor Agent est décrite slide 7 : [voir slide 07](slide-07-inference.md)

---

## Questions d'examen possibles

1. **Définition :** Expliquez le mécanisme autorégressif d'un LLM et en quoi il conduit à l'hallucination.
2. **Comparaison :** Distinguez hallucination factuelle et hallucination structurelle dans le contexte SQL. Laquelle est la plus dangereuse pour une base de données de production ?
3. **Application :** Estimez le coût mensuel d'un LLM général appelé 10 000 fois par jour pour du diagnostic de BDD. Pourquoi cela est-il problématique ?
4. **Analyse :** En quoi l'approche ReAct améliore-t-elle les agents LLM ? Quelles limites subsistent ?
5. **Synthèse :** Pourquoi les trois limitations (hallucination, coût, précision) sont-elles interdépendantes ? Peut-on résoudre l'une sans aggraver les autres ?
