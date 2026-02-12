# Tout comprendre sur les Index de Base de Données

## 1. C'est quoi exactement un Index ?

Imaginez que vous cherchez la définition du mot **"Hachage"** dans un dictionnaire de 1000 pages.

*   **Sans Index (Full Table Scan) :** Vous commencez à la page 1, et vous lisez chaque mot jusqu'à trouver "Hachage". Si le mot est à la page 950, vous avez perdu énormément de temps.
*   **Avec Index :** Vous allez à la fin du dictionnaire, à la section "Table des matières" ou "Index alphabétique". Vous cherchez "H", puis "Ha...". L'index vous dit : *"Hachage est à la page 950"*. Vous ouvrez directement la page 950.

**En base de données, c'est pareil :**
Un index est une structure de données **séparée** de la table. Elle contient :
1.  La **valeur** de la colonne indexée (ex: l'ID du réalisateur).
2.  Un **pointeur** (appelé **ROWID**) qui est l'adresse physique exacte de la ligne sur le disque dur.

---

## 2. Comment c'est utilisé par le moteur SQL ?

Reprenons l'exemple de l'exercice 2 : `IDX-ARTISTE-ID` sur la colonne `IDREALISATEUR` de la table `FILM`.

### Le scénario : `WHERE F.IDREALISATEUR = 10`

1.  **L'Index Scan :** Le moteur ne regarde pas la table `FILM`. Il va dans le petit fichier de l'index. Comme l'index est **trié**, il trouve le chiffre `10` très vite (en utilisant une recherche binaire).
2.  **La récupération du ROWID :** À côté du chiffre `10`, l'index contient une liste d'adresses : `[Bloc A-Ligne 4, Bloc C-Ligne 12, ...]`.
3.  **L'accès à la table (Table Access by ROWID) :** Le moteur "saute" directement aux adresses indiquées pour récupérer le titre du film ("Psychose", etc.).

---

## 3. Les types d'Index (La technique)

### A. L'Index B-Tree (Le plus commun)
C'est une structure en arbre. Pour trouver une valeur, le moteur descend les branches.
*   *Avantage :* Très rapide pour les recherches exactes (`=`) et les plages de valeurs (`BETWEEN 10 AND 20`).
*   *Inconvénient :* Doit être mis à jour à chaque `INSERT` ou `DELETE` dans la table.

### B. L'Index Bitmap
Au lieu d'un arbre, c'est une grille de 0 et de 1.
*   *Utilisation :* Pour des colonnes avec peu de valeurs différentes (ex: Colonne `Sexe`, `Région`, `Couleur`).
*   *Avantage :* Prend très peu de place, génial pour les entrepôts de données (Data Warehouse).

---

## 4. Métaphore : Le Vestiaire d'une boîte de nuit

Vous avez 500 manteaux dans un vestiaire.

*   **Sans Index :** Quand un client arrive avec le ticket n°142, vous regardez chaque manteau un par un jusqu'à trouver le n°142. (C'est le **Full Table Scan**).
*   **Avec Index :** Vous avez rangé les manteaux sur des portants numérotés (1 à 100, 101 à 200, etc.). Vous allez directement au portant "101-200" et vous prenez le 42ème. (C'est l'**Index Scan**).

---

## 5. Pourquoi on n'indexe pas TOUT ?

Si les index sont si géniaux, pourquoi ne pas en mettre sur chaque colonne ?
1.  **Le poids :** Un index prend de la place sur le disque. Parfois plus que la table elle-même !
2.  **Le ralentissement des écritures :** Chaque fois que vous ajoutez un film, la base de données doit :
    *   Écrire le film dans la table.
    *   **ET** mettre à jour l'index (réorganiser l'arbre pour que tout reste trié).
    *   *Si vous avez 10 index, une simple insertion devient 11 écritures !*

**Règle d'or :** On indexe les colonnes qui servent souvent dans les `WHERE` et les `JOIN`, mais on reste économe.
