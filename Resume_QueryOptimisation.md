# Optimisations Logiques et Physiques des Requêtes

## Informations du Document

- **Auteur**: Ladjel BELLATRECHE
- **Email**: bellatreche@ensma.fr
- **Institution**: Laboratoire d'Informatique et d'Automatique pour les Systèmes (LIAS)
- **Téléphone**: 05 49 49 80 72
- **Date de création**: 26 février 2023
- **Pages**: 286
- **Taille**: 9.7 Mo

---

## Table des Matières

1. [Introduction et Modélisation](#1-introduction-et-modélisation)
2. [Structures Physiques](#2-structures-physiques)
3. [Traitement des Requêtes](#3-traitement-des-requêtes)
4. [Algorithmes de Jointure](#4-algorithmes-de-jointure)
5. [Optimisation des Requêtes](#5-optimisation-des-requêtes)
6. [Aspects Avancés](#6-aspects-avancés)

---

## Vue d'Ensemble

Ce document est un cours complet sur l'optimisation des requêtes dans les systèmes de gestion de bases de données (SGBD). Il couvre l'ensemble du processus d'optimisation, depuis la modélisation conceptuelle jusqu'aux aspects physiques et algorithmiques de l'exécution des requêtes.

### Objectifs Pédagogiques

- Comprendre les fondements de la modélisation de données
- Maîtriser les structures physiques de stockage
- Analyser les algorithmes de traitement des requêtes
- Optimiser les performances des requêtes SQL
- Évaluer et comparer différentes stratégies d'exécution

---

## 1. Introduction et Modélisation

**Pages**: 1-10

### Concepts Clés

- `disque`
- `optimisation`
- `query`
- `requête`
- `sql`

### Sujets Abordés

- **Page 1**: Laboratoire d’Informatique et d’Automatique pour les Systèmes
- **Page 2**: ConceptualModelLogicalModel
- **Page 2**: External ModelConceptual requirementsConceptual requirements
- **Page 2**: Conceptual requirementsConceptual requirements
- **Page 2**: Application 2Application 3Application 4
- **Page 2**: External ModelExternal ModelExternal Model
- **Page 3**: Modélisation conceptuelle
- **Page 3**: Dictionnairedes données
- **Page 3**: ModélisationConceptuelleModèle Entité/associationUML
- **Page 3**: Modèle conceptuel de donnéesDiagramme de classes

---

## 2. Structures Physiques

**Pages**: 11-30

### Concepts Clés

- `b-tree`
- `buffer`
- `coût`
- `disque`
- `hash`
- `index`
- `join`
- `jointure`
- `optimisation`
- `plan`
- `query`
- `requête`
- `sql`
- `sélection`

### Sujets Abordés

- **Page 12**: Structure d’un tampon
- **Page 12**: Mémoire centrale Buffer
- **Page 12**: Un tampon est formé d’une suite de caseset chacune peut contenir une page
- **Page 22**: Techniques d’indexation‣Arbre B (B-tree)‣Hachage‣Bitmap
- **Page 23**: 1. Accèsséquentiel 2.Accès direct: utilisation d’index
- **Page 23**: SSNNameAddress123SmithMain str234JosesForbes ave125TomsonMain str
- **Page 24**: Index –idée principale
- **Page 26**: P1 Pri-1P2 Pi Pri Prq-1 PqPr1
- **Page 29**: Requêtes‣Scénario pour les requêtes singulières‣Prédicat de sélection: SSN=8

---

## 3. Traitement des Requêtes

**Pages**: 31-70

### Concepts Clés

- `algorithme`
- `coût`
- `disque`
- `hash`
- `index`
- `join`
- `jointure`
- `optimisation`
- `plan`
- `projection`
- `query`
- `requête`
- `sql`
- `sélection`

### Sujets Abordés

- **Page 31**: Requêtes‣Scénario pour les requêtes singulières‣Prédicat de sélection: SSN=8
- **Page 33**: Requêtes‣Algorithme d’accès
- **Page 33**: <6>6<9 >9 H étapes = accès disque
- **Page 40**: ExempleROWID(RID) Soudeur Fraiseur Sableur Tourneur
- **Page 40**: 00055 :000 :0023 0 1 0 0
- **Page 40**: 00234 :020 :8922 1 0 0 0
- **Page 40**: 19000 :328 :6200 0 0 0 1
- **Page 40**: 21088 :120 :1002 0 0 1 0
- **Page 42**: SQL: CREATE INDEX BITMAP ONOuvrier(Salaire) TABLESPACESal_espace
- **Page 46**: Exemple60 Erable argenté 15.99
- **Page 46**: 70 Herbe à puce 10.99
- **Page 46**: 40 Epinette bleue 25.99
- **Page 46**: 10 Cèdre en boule 10.99
- **Page 47**: Performances se dégradent
- **Page 48**: Exemplede mise à jour
- **Page 48**: 60Erable argenté15.9990 Pommier25.9981 Catalpa25.99
- **Page 48**: 70Herbe à puce10.9940Epinette bleue25.9910Cèdre en boule10.99
- **Page 48**: 20 Sapin12.9950 Chêne22.9995 Génévrier15.9980 Poirier26.99
- **Page 48**: 89 Citronnier29.45Instance à insérer
- **Page 52**: Guide d’utilisation des index en cours d’exploitation d’une BD

---

## 4. Algorithmes de Jointure

**Pages**: 71-140

### Concepts Clés

- `algorithme`
- `coût`
- `disque`
- `hash`
- `index`
- `join`
- `jointure`
- `merge`
- `nested loop`
- `optimisation`
- `plan`
- `projection`
- `query`
- `requête`
- `sort`
- `sql`
- `sélection`

### Sujets Abordés

- **Page 71**: Combiner les sélection avec un produit cartésien pour aboutir à une jointure
- **Page 72**: Combiner des séquences d’opérations unaires
- **Page 77**: Méthodes d’optimisation basées sur les modèles de coûts« Cost-basedMethods»
- **Page 80**: Modèle du coût d'une entrée-sortie en mémoire secondaire
- **Page 81**: Statistiques au sujet des tables
- **Page 87**: Algorithmes Générauxpour les Opérateurs Relationnels
- **Page 91**: Jointure par boucles imbriquées
- **Page 93**: Jointure par tri fusion
- **Page 97**: s ISBN = 1-111-1111-1
- **Page 98**: Choix du meilleur plan
- **Page 98**: Plan d'exécutionOptimal
- **Page 98**: Stratégie deRecherche
- **Page 98**: Bibliothèque detransformations
- **Page 99**: Différentes Stratégies
- **Page 99**: Stratégiede recherche
- **Page 99**: ExhaustiveAugmentation GénétiqueAméliorationitérativeRecuitsimulé
- **Page 100**: Arbre biaisé à gauche Arbre biaisé à droiteArbre équilibré
- **Page 105**: Consommation de ressources
- **Page 115**: IndexSELECT /*+ RULE*/ nom
- **Page 115**: WHERE noClient = 10 ;

---

## 5. Optimisation

**Pages**: 141-200

### Concepts Clés

- `buffer`
- `disque`
- `hash`
- `index`
- `join`
- `merge`
- `optimisation`
- `plan`
- `query`
- `requête`
- `sort`
- `sql`

### Sujets Abordés

- **Page 141**: World’s Most Valuable Resource
- **Page 141**: “Data isthe new currency.” Antonio Neri, PresidentHewlett Packard Enterprise
- **Page 141**: 1.Data Science2.Motivation3.Green Query Processors4.Summary
- **Page 141**: M. TamerÖzsu: Data Science: A SystematicTreatment. CoRRabs/2301.13761 (2023)
- **Page 144**: Data Science Ecosystem
- **Page 144**: Data Engineering •Big data management •Data analysis•Data understanding•Data preparation
- **Page 144**: 4 Pillars of Data ScienceApplications
- **Page 144**: Social and Policy Context
- **Page 145**: Data Preparation§Data acquisition/gathering §Data cleaning§Data provenance & lineage
- **Page 145**: Data understanding & analysis§Data proﬁling§Detection of anomalies§Data changes
- **Page 146**: PrescriptivePredictive
- **Page 146**: §Why is it happening?§What does the data suggest about the reasons? Diagnostic
- **Page 146**: §Recommended actions Prescriptive
- **Page 146**: §What is likely to happen?§Decisions are affected§Machine learning fits here
- **Page 146**: https://www.kdnuggets.com/2017/07/4-types-data-analytics.html
- **Page 147**: -Organize-Filter -Annotate-Clean
- **Page 147**: -Store to:▻Preserve ▻Replicate▻Ignore -Subset, compress-Index -Curate-Destroy
- **Page 147**: {Ethics, Policy, Regulatory, Platform, Domain} Environment
- **Page 148**: Data Science Lifecycle
- **Page 148**: Data preparationDeployment andDissemination

---

## 6. Aspects Avancés

**Pages**: 201-286

### Concepts Clés

- `algorithme`
- `coût`
- `hash`
- `index`
- `join`
- `jointure`
- `merge`
- `optimisation`
- `plan`
- `projection`
- `query`
- `requête`
- `sort`
- `sql`
- `sélection`

### Sujets Abordés

- **Page 204**: Processus de répartition
- **Page 204**: BDClientsParisiensBDClientsPoitevinsBDClientsNiortais
- **Page 206**: FichierstexteFichierstexteFichierstexteInformationsPaysMétéo
- **Page 206**: SQLtuplesOQLobjetsXQueryXMLMoteur derecherchesHTMLAPIinstances
- **Page 206**: ?Exemple:Chercher où  passer les vacances cet été.
- **Page 208**: Architecture des schémas d’une BDR
- **Page 208**: Schéma externeglobal1Schéma externeglobal2Schéma externeglobal3
- **Page 208**: Schéma conceptuelglobalSchéma de placement
- **Page 208**: Schéma conceptuellocal2
- **Page 208**: Schéma externelocal1Schéma externelocal1Schéma conceptuellocal1Schéma externelocal1
- **Page 210**: Conception descendanteConception ascendanteECLATEMENT
- **Page 213**: Objectifs de la décomposition
- **Page 213**: Relation GlobaleFragmentation
- **Page 215**: Fragmentation horizontale
- **Page 215**: Décomposition de la table en groupes de lignes
- **Page 215**: Table Client(N°Client, Nom, Ville)Fragment1(partition1)
- **Page 215**: Fragment2(partition2)"Deux types de fragmentation horizontale:-Primaire-Dérivée
- **Page 216**: Fragmentation horizontale primaire
- **Page 217**: Fragmentation horizontale dérivée(I)
- **Page 217**: "Fragmentation d’une table en fonction des fragments horizontaux d’une autre table

---

## Détails Techniques

### Architecture Physique des SGBD

**Structure de stockage** (basé sur les pages 9-15):
- Organisation des données sur disque
- Gestion des tampons (buffers) en mémoire
- Mécanismes de lecture/écriture
- Optimisation des accès disque

### Algorithmes de Jointure Détaillés

#### 1. Nested Loop Join (Jointure par Boucles Imbriquées)
- Principe: Parcours de la table externe et recherche dans la table interne
- Complexité: O(n * m) où n et m sont les tailles des tables
- Utilisation: Petites tables ou avec index sur la table interne
- Variantes: Block Nested Loop, Index Nested Loop

#### 2. Hash Join
- Principe: Création d'une table de hachage pour une des tables
- Phase 1 (Build): Construction de la table de hachage
- Phase 2 (Probe): Parcours de l'autre table et recherche dans le hash
- Complexité: O(n + m) dans le cas optimal
- Avantage: Très efficace pour les jointures équi-join

#### 3. Sort-Merge Join
- Principe: Tri des deux tables puis fusion
- Phase 1: Tri des deux relations sur l'attribut de jointure
- Phase 2: Fusion des deux relations triées
- Complexité: O(n log n + m log m)
- Avantage: Produit un résultat trié

### Optimisation des Requêtes

#### Optimisation Logique
- **Transformations algébriques**: Application de règles d'équivalence
- **Règles de réécriture**: 
  - Descente des sélections (push-down)
  - Descente des projections
  - Regroupement des sélections
  - Commutativité et associativité des jointures

#### Optimisation Physique
- **Choix des algorithmes**: Sélection de l'algorithme optimal pour chaque opération
- **Utilisation des index**: B-tree, Hash, Bitmap
- **Ordre des jointures**: Détermination de l'ordre optimal d'exécution
- **Estimation des coûts**: 
  - Coût CPU
  - Coût I/O (lecture/écriture disque)
  - Taille des résultats intermédiaires

### Structures de Données Importantes

#### Index B-Tree
- Structure arborescente équilibrée
- Recherche en O(log n)
- Maintien de l'ordre des clés
- Efficace pour les requêtes de plage

#### Index Hash
- Accès direct via fonction de hachage
- Recherche en O(1) en moyenne
- Optimisé pour les recherches par égalité
- Ne supporte pas les requêtes de plage

### Schémas de Jointure Spéciaux

#### Jointure en Étoile (Star Join)
- Utilisé dans les entrepôts de données (Data Warehouses)
- Table de faits centrale reliée à plusieurs tables de dimensions
- Optimisation spécifique pour ce type de schéma
- Utilisation de bitmap index pour améliorer les performances

### Green Query Processors
- Optimisation énergétique des requêtes
- Réduction de la consommation d'énergie
- Trade-off entre performance et consommation
- Importance croissante avec le Big Data

---

## Conclusion

Ce document couvre l'ensemble du spectre de l'optimisation des requêtes dans les SGBD, depuis les fondements théoriques (algèbre relationnelle, modélisation) jusqu'aux aspects pratiques (algorithmes, structures de données, estimation de coûts).

### Points Clés à Retenir

1. **Modélisation**: La qualité du schéma conceptuel impacte directement les performances
2. **Structures physiques**: Le choix des index et de l'organisation physique est crucial
3. **Algorithmes**: Chaque algorithme a ses avantages selon le contexte
4. **Optimisation**: L'optimiseur doit choisir le meilleur plan d'exécution
5. **Coûts**: L'estimation précise des coûts est essentielle pour l'optimisation

### Applications Pratiques

- Conception de bases de données relationnelles
- Tuning de performances SQL
- Architecture d'entrepôts de données
- Systèmes Big Data et distribués
- Optimisation énergétique (Green Computing)
