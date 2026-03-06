# Explications Détaillées : Algorithmes de Jointure

## 1. La Jointure : À quel moment est-elle exécutée ?

Pour répondre à votre question fondamentale : **Oui, l'algorithme de jointure est exécuté à chaque fois que vous lancez la requête.**

### Pourquoi ?
*   **Nature dynamique :** Une base de données est vivante. Les données dans les tables `FILM` ou `SEANCE` changent (insertions, suppressions, mises à jour). Si la jointure était faite "une fois pour toutes", le résultat deviendrait immédiatement obsolète dès qu'une donnée change.
*   **Plan d'exécution :** Quand vous lancez un `SELECT ... JOIN ...`, le moteur de la base de données (l'optimiseur) analyse la requête, regarde les statistiques actuelles (taille des tables, index disponibles) et décide *à ce moment précis* quel algorithme utiliser.

### Nuance (Exceptions)
Il existe des mécanismes pour "sauvegarder" une jointure :
*   **Vues Matérialisées (Materialized Views) :** C'est une table physique qui stocke le résultat d'une requête. Là, la jointure est faite une fois, et on interroge le résultat stocké. Mais il faut rafraîchir cette vue périodiquement.
*   **Caches :** La base de données peut garder en mémoire cache le résultat d'une requête identique lancée récemment.

---

## 2. Les Algorithmes de Jointure (Détails)

Supposons une jointure entre deux tables : **R (Outer/Gauche)** et **S (Inner/Droite)**.

### A. Boucles Imbriquées (Nested Loop Join)
C'est l'approche "force brute". C'est l'algorithme le plus simple et le plus flexible (fonctionne avec n'importe quelle condition : `=`, `<`, `>`, `!=`).

**Fonctionnement :**
1.  On prend la première ligne de la table **R**.
2.  On parcourt **toute** la table **S** pour trouver les correspondances.
3.  On passe à la ligne suivante de **R** et on recommence le parcours de **S**.

**Analogie :** Vous avez un paquet de cartes rouges (R) et un paquet de cartes bleues (S). Vous prenez une carte rouge, vous la comparez à *toutes* les cartes bleues une par une. Puis vous prenez la carte rouge suivante, etc.

**Performance :**
*   Très lent pour les grosses tables ($Coût \approx Taille(R) 	imes Taille(S)$).
*   **Optimisation (Index Nested Loop) :** Si la table **S** possède un **Index** sur la colonne de jointure, on ne parcourt pas toute la table S à chaque fois. On utilise l'index pour trouver directement les correspondances. C'est très rapide si R est petit.

### B. Jointure par Hachage (Hash Join)
C'est souvent l'algorithme le plus rapide pour les jointures d'égalité (Equi-Join, `WHERE R.id = S.id`) sur de grandes tables non triées.

#### 1. Zoom sur le concept de "Hachage"
Pour comprendre cet algo, il faut comprendre ce qu'est une **Table de Hachage**.
*   **La fonction de hachage :** C'est une moulinette mathématique. Vous lui donnez une valeur (ex: "Hitchcock" ou "ID=42"), et elle vous rend un **indice** (un numéro de case).
*   **Propriété clé :** Une même valeur donnera *toujours* le même indice. Par contre, deux valeurs différentes *peuvent* tomber dans la même case (c'est ce qu'on appelle une **collision**, gérée par une liste chaînée dans la case).

#### 2. La Métaphore du "Tri des Chaussettes"
Imaginez que vous avez une montagne de chaussettes dépareillées dans deux paniers : le panier **R** et le panier **S**. Vous voulez former des paires.

*   **Approche Nested Loop (Boucles imbriquées) :** Vous prenez une chaussette de R, et vous fouillez *tout* le panier S pour trouver sa jumelle. Vous faites ça pour chaque chaussette de R. Si vous avez 1000 chaussettes dans chaque panier, c'est l'enfer.
*   **Approche Hash Join (Hachage) :**
    1.  **Phase Build (Construction) :** Vous prenez un meuble de rangement avec 10 tiroirs numérotés de 0 à 9. Vous prenez chaque chaussette du panier **R**. Si elle est rouge, vous la mettez dans le tiroir 1. Si elle est bleue, tiroir 2, etc. (La couleur est votre "fonction de hachage").
    2.  **Phase Probe (Sondage) :** Vous videz le panier R. Maintenant, vous prenez une chaussette du panier **S**. Elle est bleue ? Vous n'avez pas besoin de chercher partout : vous ouvrez **directement** le tiroir 2. Si une chaussette s'y trouve, vous avez votre paire.

#### 3. Exemple Concret SQL
Tables : `ARTISTE` (ID, Nom) et `FILM` (ID_Realisateur, Titre)
`SELECT Nom, Titre FROM ARTISTE JOIN FILM ON ARTISTE.ID = FILM.ID_Realisateur`

1.  **Build Phase (sur ARTISTE) :**
    *   ID=10 (Hitchcock) -> Hachage(10) = Case 4. On stocke {10, Hitchcock} en Case 4.
    *   ID=25 (Spielberg) -> Hachage(25) = Case 1. On stocke {25, Spielberg} en Case 1.
2.  **Probe Phase (sur FILM) :**
    *   Film "Psychose" (ID_Realisateur=10).
    *   On calcule Hachage(10) = Case 4.
    *   On regarde la Case 4 -> "Hitchcock" trouvé ! -> Résultat : {Hitchcock, Psychose}.

#### 4. Comparaison et Limites
*   **Pourquoi c'est rapide ?** Parce qu'on ne compare pas chaque ligne à toutes les autres. On va directement à l'adresse mémoire où se trouve la réponse potentielle. On passe d'une complexité $O(N \times M)$ à $O(N + M)$.
*   **Le point faible (La RAM) :** Si la table de hachage (le meuble à tiroirs) est trop grosse pour la mémoire vive (RAM), l'ordinateur doit écrire des morceaux sur le disque dur. C'est là qu'on passe au **Grace Hash Join** (vu en Exercice 1), qui est plus lent car le disque est l'ennemi de la performance.
*   **L'inégalité :** Le hachage ne fonctionne **que pour l'égalité (`=`)**. Si vous voulez trouver tous les films sortis *après* la naissance d'un réalisateur (`Film.date > Artiste.naissance`), le hachage est inutile car "plus grand que" ne permet pas de cibler un tiroir précis. Dans ce cas, on revient au **Nested Loop** ou **Sort-Merge**.

### C. Tri-Fusion (Sort-Merge Join)
Cet algorithme est excellent si les données sont déjà triées ou si on a besoin du résultat trié.

**Fonctionnement :**
1.  **Tri (Sort) :** On trie la table **R** sur la colonne de jointure (si pas déjà fait). On trie la table **S** sur la colonne de jointure (si pas déjà fait).
2.  **Fusion (Merge) :** On parcourt les deux tables triées simultanément (comme une fermeture éclair).
    *   Si `R.id < S.id`, on avance dans R.
    *   Si `R.id > S.id`, on avance dans S.
    *   Si `R.id = S.id`, on a une correspondance, on génère le résultat et on continue.

**Analogie :** Vous avez classé vos cartes rouges par ordre croissant et vos cartes bleues par ordre croissant. Vous regardez juste les cartes du dessus de chaque pile. Pas besoin de revenir en arrière.

**Performance :**
*   Le coût principal est le tri ($O(N \log N)$).
*   Si les tables sont déjà triées (par exemple, grâce à un index B-Tree), l'étape de tri est gratuite, et la jointure est extrêmement rapide (similaire au Hash Join mais sans consommer autant de mémoire vive pour la table de hachage).

---

## Résumé pour choisir

| Algorithme | Conditions idéales | Coût typique |
| :--- | :--- | :--- |
| **Nested Loop** | Une table très petite, ou jointure complexe (non `=`) | Élevé (sauf si Index sur la table intérieure) |
| **Hash Join** | Grosses tables, pas d'index, jointure `=` | Linéaire (Rapide), consomme de la RAM |
| **Sort-Merge** | Tables déjà triées (Index) ou besoin de trier la sortie | Linéaire (si trié) ou Coût du tri |
