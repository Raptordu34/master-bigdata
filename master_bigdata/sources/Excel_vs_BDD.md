# Peut-on utiliser Excel comme Base de Données ?

## 1. Pourquoi on est tenté de le faire ?
*   **Accessibilité :** Tout le monde a Excel.
*   **Visuel :** On voit les données immédiatement, on peut les colorier, faire des filtres en deux clics.
*   **Flexibilité :** On peut taper n'importe quoi dans n'importe quelle case (ce qui est aussi son plus gros défaut).

## 2. Pourquoi c'est une TRÈS mauvaise idée (Les limites)

### A. L'absence d'Index (Le problème de performance)
Comme on l'a vu pour les jointures, une BDD utilise des **Index B-Tree**.
*   **Excel :** Pour trouver une ligne dans 1 million de lignes, Excel doit souvent tout lire du début à la fin (**Full Scan** obligatoire). C'est lent.
*   **BDD :** Elle trouve la ligne en quelques millisecondes grâce à l'index.

### B. Les accès concurrents (Le problème de partage)
*   **Excel :** Si Jean et Marie ouvrent le même fichier Excel sur le réseau et tentent de modifier la même cellule en même temps, le fichier finit par dire "Lecture seule" ou crée des "copies de conflit".
*   **BDD :** Elle est conçue pour que des milliers de personnes lisent et écrivent en même temps grâce au concept de **Transactions** et de **Verrous (Locks)**.

### C. L'Intégrité des données
*   **Excel :** Rien ne m'empêche d'écrire "Hitchcock" dans la colonne `DATE_DE_NAISSANCE`. Le système l'acceptera.
*   **BDD :** Elle impose des contraintes strictes (`NOT NULL`, `TYPE=DATE`, `FOREIGN KEY`). Si vous essayez de supprimer un Réalisateur qui a encore des Films, la BDD vous bloque pour éviter les données orphelines.

### D. La taille
*   **Excel :** Limité à 1 048 576 lignes. Ça paraît beaucoup, mais pour du Big Data (logs serveurs, transactions bancaires), on les atteint en quelques minutes.
*   **BDD :** Peut gérer des Tera-octets de données répartis sur plusieurs serveurs.

## 3. La Métaphore : Le Carnet vs La Bibliothèque

*   **Excel, c'est ton carnet de notes personnel :** C'est génial pour noter tes courses ou tes contacts. Si tu le perds ou si tu ratures, c'est pas grave. Mais si 50 personnes veulent écrire dedans en même temps, ça devient illisible.
*   **Une BDD, c'est une Bibliothèque Nationale :** Il y a des bibliothécaires (le moteur SQL), un système d'indexation ultra précis, des règles de sécurité, et des milliers de personnes peuvent consulter les livres sans se marcher dessus.

## 4. Quand est-ce qu'on utilise "presque" Excel ?
Il existe un format intermédiaire : le **CSV**.
C'est un fichier texte tout simple. Beaucoup de systèmes de **Big Data** (comme Spark ou Hadoop) lisent des milliers de fichiers CSV. Mais attention : ils ne les utilisent pas comme une BDD interactive, ils les utilisent comme une source de données brute pour faire des calculs massifs.

**En résumé :** Si ton projet dépasse 1 utilisateur ou 10 000 lignes, passe sur une vraie BDD (SQLite pour le local, PostgreSQL ou Oracle pour le pro).
