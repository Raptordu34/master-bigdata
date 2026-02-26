# Classification des Structures d'Optimisation

Dans le domaine des bases de données et des entrepôts de données (Data Warehouses), il existe de nombreuses techniques pour optimiser les performances. Les chercheurs ont classifié ces techniques selon la manière dont elles sont sélectionnées et combinées.

## Les Acronymes des Techniques d'Optimisation

D'après les publications scientifiques citées dans le cours, voici les principales structures d'optimisation utilisées :

*   **FH (Fragmentation Horizontale) :** Découper une table en plusieurs morceaux (partitions) selon les lignes (ex: une partition par année).
*   **FV (Fragmentation Verticale) :** Découper une table selon ses colonnes (ex: séparer les colonnes très lues des colonnes rarement lues).
*   **IX (Index) :** Création d'index (B-Tree, Bitmap, Join Index) pour accélérer la recherche.
*   **VM (Vues Matérialisées) :** Pré-calculer et stocker physiquement le résultat de requêtes complexes.
*   **TP (Table Partitioning) :** Partitionnement de tables (souvent lié ou synonyme de la fragmentation horizontale dans les SGBD modernes).

---

## Les Deux Approches de Sélection (Classifications)

Le problème pour un Administrateur de Base de Données (DBA) est de savoir **quelles techniques choisir et comment les combiner** pour obtenir les meilleures performances, sachant que chaque technique consomme de l'espace disque et ralentit les mises à jour.

### 1. Sélection Isolée (Indépendante)
*Première classification [Dexa07]*

Dans cette approche, l'administrateur (ou l'outil d'optimisation) choisit et configure **une seule technique à la fois**, sans se soucier des autres.

*   **Exemples de recherches sur des techniques isolées :**
    *   Optimisation uniquement par **FH** (Ceri 82, Bellatreche 00).
    *   Optimisation uniquement par **IX** (Chaudhuri 98, Golfarelli 02).
    *   Optimisation uniquement par **FV** (Navathe 89).
    *   Optimisation uniquement par **TP** (Stohr 00).
    *   Optimisation uniquement par **VM** (Gupta 99, Lee 01).

*   **Inconvénient :** Si on crée des index d'un côté, et des vues matérialisées de l'autre sans concertation, on risque de faire des choix redondants ou sous-optimaux (ex: créer un index sur une table qui ne sera plus lue car une vue matérialisée la remplace).

### 2. Sélection Multiple (Simultanée)
*Deuxième classification [Dawak08]*

C'est l'approche moderne et plus complexe. L'administrateur (ou l'outil) sélectionne **plusieurs techniques simultanément** en prenant en compte leurs interactions. L'objectif est de trouver la combinaison globale optimale sous une contrainte d'espace disque global.

*   **Exemples de recherches sur des combinaisons de techniques :**
    *   Combinaison **FH + VM + IX** (Sanjay 04, Zilio 04, Gebaly 08) : *Comment partitionner les données, tout en créant les bonnes vues matérialisées et les bons index sur ces vues/partitions ?*
    *   Combinaison **FH + IX + TP** (Stohr 00).
    *   Combinaison **VM + IX** (Bellatreche 00, Aouiche 05) : *Quels index créer sur quelles vues matérialisées ?*
    *   Combinaison **FH + FV** (Stratos 04) : *Fragmentation hybride (découpage en lignes ET en colonnes).*

## Illustration du rôle de l'Administrateur

Face à une charge de travail (Workload) donnée, l'administrateur a deux choix :
1.  **Sélectionner les techniques de manière indépendante :** Il lance un outil pour trouver les meilleurs index, puis un autre outil pour trouver les meilleures vues matérialisées. (Approche sous-optimale).
2.  **Sélectionner les techniques simultanément :** Il utilise un outil global (comme le *Database Engine Tuning Advisor* de SQL Server ou le *SQL Access Advisor* d'Oracle) qui va analyser la charge et proposer un "package" complet : *"Créez ces 2 vues matérialisées, partitionnez cette table, et ajoutez ces 3 index"*. (Approche optimale).
