# Solutions TD : Optimisations dirigées par Modèles de Coût

## Exercice 1 : Estimation du coût de la jointure par hachage

La question demande d'estimer le coût en termes d'entrées/sorties (I/O) pour une jointure entre deux relations $R$ et $S$.

Le coût dépend de la taille des relations par rapport à la mémoire disponible. Voici les deux cas principaux :

### 1. Cas Général (Grace Hash Join)
Si les relations sont trop grandes pour tenir en mémoire, on utilise généralement le *Grace Hash Join*.
*   **Coût total :** $3(B(R) + B(S))$

**Détail :**
*   $B(R)$ et $B(S)$ représentent le nombre de pages (blocs) des relations $R$ et $S$.
*   **Phase 1 (Partitionnement) :** On lit $R$ et $S$ et on les réécrit sur le disque dans des partitions (buckets).
    *   Lecture : $B(R) + B(S)$
    *   Écriture : $B(R) + B(S)$
*   **Phase 2 (Jointure/Probing) :** On relit chaque partition paire pour effectuer la jointure.
    *   Lecture : $B(R) + B(S)$

### 2. Cas Simple (In-Memory Hash Join)
Si la plus petite relation (disons $R$) tient entièrement en mémoire.
*   **Coût total :** $B(R) + B(S)$

**Détail :**
*   On lit $R$ pour construire la table de hachage en mémoire ($B(R)$).
*   On lit $S$ ligne par ligne pour vérifier les correspondances ($B(S)$).
*   Aucune écriture intermédiaire sur le disque n'est nécessaire.

---

## Exercice 2 : Plan d'exécution de requêtes

### 1. Expression algébrique et Arbre optimal

**Requête SQL :**
```sql
SELECT F.TITRE
FROM SEANCE S, FILM F, ARTISTE A
WHERE A.NOM = 'Hitchcock'
AND F.IDREALISATEUR = A.IDREALISATEUR
AND S.IDFILM = F.IDFILM
AND S.HEURE_DEBUT > '20:00'
```

**Expression Algébrique :**
$\Pi_{F.TITRE} ((\sigma_{A.NOM = 'Hitchcock'}(A) \bowtie_{A.IDREALISATEUR = F.IDREALISATEUR} F) \bowtie_{F.IDFILM = S.IDFILM} \sigma_{S.HEURE\_DEBUT > '20:00'}(S))$

**Arbre Algébrique Optimal :**
L'optimisation consiste à **pousser les sélections** le plus bas possible pour réduire la taille des données avant les jointures.

1.  **Niveau 0 (Feuilles) :** Les tables de base `ARTISTE`, `FILM`, `SEANCE`.
2.  **Niveau 1 (Sélections) :**
    *   Appliquer $\sigma_{NOM = 'Hitchcock'}$ sur `ARTISTE`.
    *   Appliquer $\sigma_{HEURE\_DEBUT > '20:00'}$ sur `SEANCE`.
3.  **Niveau 2 (Jointure 1) :** Joindre le résultat d'`ARTISTE` filtré avec `FILM` sur la condition `IDREALISATEUR`.
4.  **Niveau 3 (Jointure 2) :** Joindre le résultat précédent avec `SEANCE` filtrée sur la condition `IDFILM`.
5.  **Niveau 4 (Projection) :** $\Pi_{TITRE}$ sur le résultat final.

```text
          Π (TITRE)
              |
              ⨝ (F.IDFILM = S.IDFILM)
            /   \
           /     σ (HEURE_DEBUT > '20:00')
          /        |
         ⨝ (A.IDREAL = F.IDREAL)  SEANCE
       /   \
      /     FILM
σ (NOM='Hitchcock')
      |
   ARTISTE
```

### 2. Commentaire du plan d'exécution (Oracle)

Le plan fourni par l'outil `EXPLAIN` se lit de l'intérieur vers l'extérieur (les opérations les plus indentées sont les premières exécutées).

#### A. Analyse pas à pas (L'approche progressive)

1.  **Étape 4 & 6-5 (La première jointure : ARTISTE ⨝ FILM)**
    *   **Opération :** `NESTED LOOPS` (Boucles imbriquées).
    *   **Détail :** Oracle parcourt toute la table `ARTISTE` (`TABLE ACCESS FULL`). Pour chaque artiste trouvé, il ne parcourt pas toute la table `FILM`. Il utilise un index (`IDX-ARTISTE-ID`) pour trouver l'adresse physique (`ROWID`) des films correspondants, puis va chercher la ligne précise dans `FILM` (`TABLE ACCESS BY ROWID`).
    *   **Pourquoi ?** C'est très efficace si le nombre d'artistes filtrés (Hitchcock) est très petit. On va "pointer" directement les films.

2.  **Étape 2 & 7-8 (Préparation de la seconde jointure)**
    *   **Opération :** `SORT Join`.
    *   **Détail :** Le résultat de la première jointure (les films de Hitchcock) est trié. En parallèle, la table `SEANCE` est lue entièrement (`TABLE ACCESS FULL`) et triée également sur la colonne de jointure (`IDFILM`).

3.  **Étape 1 (La jointure finale)**
    *   **Opération :** `MERGE JOIN` (Tri-Fusion).
    *   **Détail :** Comme les deux flux de données sont maintenant triés, Oracle les fusionne simplement comme une fermeture éclair.

#### B. Les Structures d'Accès identifiées
*   **Full Table Scan (FTS) :** Utilisé sur `ARTISTE` et `SEANCE`. On lit tout le bloc de données. C'est efficace pour `ARTISTE` si la table est petite, ou pour `SEANCE` si on doit en traiter une grande partie.
*   **Index Range Scan :** On parcourt une plage de l'index. Ici, on cherche tous les films liés à un ID d'artiste.
*   **Table Access by ROWID :** C'est l'accès le plus rapide possible à une ligne unique. L'index donne le "code GPS" (ROWID) et Oracle y va directement.

#### C. La Métaphore du Festival de Cinéma

Imaginez que vous devez organiser une projection des films de Hitchcock.

1.  **Le carnet d'adresses (NESTED LOOP) :** Vous lisez toute votre liste de réalisateurs (**Full Scan ARTISTE**). Vous trouvez "Hitchcock". Au lieu de fouiller dans l'immense entrepôt de bobines, vous regardez votre petit index alphabétique (**Index Scan**). Il vous dit : "Ses films sont aux étagères 4, 12 et 45". Vous allez directement à ces étagères (**Access by ROWID**) pour prendre les films (**FILM**).
2.  **Le rangement (SORT) :** Vous avez vos 3 bobines. Vous les posez sur une table par ordre d'ID. De l'autre côté, votre assistant prend le registre de toutes les séances du mois (**Full Scan SEANCE**) et les trie par ID de film (**SORT**).
3.  **La fermeture éclair (MERGE JOIN) :** Vous avez deux piles triées. Vous avancez dans les deux en même temps pour faire correspondre les films de Hitchcock avec leurs horaires. C'est fluide, car tout est déjà rangé.

**Conclusion sur ce plan :** Oracle a choisi un mélange. Il privilégie l'index pour trouver les films (car Hitchcock est unique), mais il préfère trier les séances pour la jointure finale, probablement parce qu'il y a beaucoup de séances et que le Tri-Fusion gère mieux les gros volumes que les boucles imbriquées répétées 10 000 fois.
