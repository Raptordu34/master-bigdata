# 01 — Titre & Accroche

> Présentation du framework LLMDB, une proposition de Tsinghua University pour dépasser les limites des LLMs seuls et du ML traditionnel dans la gestion de bases de données.

---

## Ce que dit la slide

**Titre :** LLM-Enhanced Data Management
**Sous-titre :** Un nouveau paradigme pour la gestion de données augmentée par les LLMs
**Source :** Xuanhe Zhou, Xinyang Zhao, Guoliang Li — Tsinghua University, arXiv février 2024

**Accroche orale :**
> "Et si on pouvait diagnostiquer une base de données, analyser un dataset ou optimiser une requête SQL… juste en le décrivant en langage naturel ?"

---

## Concepts clés expliqués

### Qu'est-ce qu'un "Vision paper" ?

Un **vision paper** (ou papier de vision) se distingue d'un papier expérimental classique :

| Critère | Papier expérimental | Vision paper |
|---|---|---|
| Objectif | Prouver qu'une technique fonctionne | Décrire une direction de recherche |
| Résultats | Benchmarks, comparaisons chiffrées | Arguments qualitatifs, exemples illustratifs |
| Système | Implémenté et évalué | Partiellement prototypé |
| Audience | Reviewers techniques | Communauté scientifique large |

LLMDB est un vision paper : les auteurs ne prétendent pas avoir construit un système complet et testé. Ils proposent une **architecture conceptuelle** et trois cas d'usage pour illustrer la faisabilité. L'implémentation de référence est DB-GPT (`github.com/TsinghuaDatabaseGroup/DB-GPT`), mais elle ne couvre pas encore tous les composants décrits.

**Implication pour l'examen :** ne pas confondre "le papier propose X" avec "le papier démontre expérimentalement X".

### Tsinghua University et l'écosystème DB-GPT

Tsinghua University (Pékin) est l'une des universités les plus actives en recherche sur les bases de données en Asie. Le groupe de Guoliang Li a contribué à plusieurs projets open source notables, dont **OpenGauss** (SGBD développé avec Huawei) et **DB-GPT**, qui est l'implémentation de référence du framework LLMDB.

DB-GPT s'inscrit dans le mouvement plus large des **AI-native databases** (bases de données natives à l'IA), où les composants d'intelligence artificielle ne sont plus des modules optionnels mais font partie intégrante du moteur.

### La question d'ouverture : pourquoi diagnostiquer une BDD en langage naturel est difficile

Pour diagnostiquer une alerte sur une base de données (par exemple, un CPU à 159 % de charge), un DBA (Database Administrator) doit aujourd'hui :

1. Interpréter l'alerte brute (code d'erreur, métrique système)
2. Corréler avec les logs d'activité en temps réel
3. Consulter une base de connaissance d'incidents passés
4. Formuler une hypothèse de cause racine (Root Cause Analysis)
5. Proposer une action corrective

Chacune de ces étapes requiert une **expertise technique pointue** et de la **mémoire contextuelle**. Les outils actuels (dashboards de monitoring, ML supervisé) rendent les étapes 1-2 automatisables, mais les étapes 3-5 restent manuelles. LLMDB propose d'automatiser l'ensemble du pipeline en langage naturel.

### arXiv : publication avant peer-review

arXiv est un serveur de pré-publications (preprints) en sciences et ingénierie. Publier sur arXiv en février 2024 signifie que l'article n'a pas (encore) été accepté dans une conférence ou revue au moment de la présentation. Cela est courant en ML et en informatique : la diffusion rapide des idées prime sur la validation formelle. À prendre en compte dans l'évaluation critique du papier.

---

## Pour aller plus loin

- La tension vision paper / papier expérimental est centrale dans la slide 11 (défis) : [voir slide 11](slide-11-defis.md)
- L'architecture concrète est décrite à partir de la slide 5 : [voir slide 05](slide-05-architecture.md)
- Le code de référence est mentionné dans la conclusion : [voir slide 12](slide-12-conclusion.md)

---

## Questions d'examen possibles

1. **Définition :** Quelle est la différence entre un vision paper et un papier expérimental ? Pourquoi cette distinction est-elle importante pour évaluer LLMDB ?
2. **Contexte :** Quelles institutions et projets sont à l'origine du framework LLMDB ?
3. **Application :** Pourquoi le diagnostic en langage naturel d'une base de données est-il un problème difficile pour les outils classiques ?
4. **Comparaison :** En quoi le fait que LLMDB soit un vision paper change-t-il la façon dont on doit interpréter ses résultats ?
