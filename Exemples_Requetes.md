# Exemples de Requêtes SQL (Exercice 2)

## 1. La Jointure Classique (Equi-join)
C'est celle de l'énoncé. On met toutes les tables dans le `FROM`.
```sql
SELECT F.TITRE
FROM FILM F, ARTISTE A
WHERE F.IDREALISATEUR = A.IDREALISATEUR
AND A.NOM = 'Hitchcock';
```

## 2. La Requête Imbriquée (Version complète du TD)
On isole la recherche de l'artiste ET la recherche des séances. Le moteur va filtrer la table `FILM` sur deux critères provenant d'autres tables.
```sql
SELECT F.TITRE
FROM FILM F
WHERE F.IDREALISATEUR = (
    -- Sous-requête 1 : Trouver l'ID de Hitchcock
    SELECT A.IDREALISATEUR 
    FROM ARTISTE A 
    WHERE A.NOM = 'Hitchcock'
)
AND F.IDFILM IN (
    -- Sous-requête 2 : Trouver les films ayant des séances après 20h
    SELECT S.IDFILM 
    FROM SEANCE S 
    WHERE S.HEURE_DEBUT > '20:00'
);
```

## 3. La Jointure Normale (Syntaxe JOIN)
C'est la syntaxe moderne la plus recommandée.
```sql
SELECT F.TITRE
FROM FILM F
JOIN ARTISTE A ON F.IDREALISATEUR = A.IDREALISATEUR
WHERE A.NOM = 'Hitchcock';
```

## 4. Requête avec Agrégation (Exemple bonus)
"Combien de films Hitchcock a-t-il réalisés ?"
```sql
SELECT COUNT(*)
FROM FILM F
JOIN ARTISTE A ON F.IDREALISATEUR = A.IDREALISATEUR
WHERE A.NOM = 'Hitchcock';
```
