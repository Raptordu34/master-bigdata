# Les Vues Matérialisées (Materialized Views)

## Qu'est-ce qu'une Vue Matérialisée ?

Contrairement à une vue classique (qui est simplement une requête SQL sauvegardée et exécutée à chaque fois qu'on l'appelle), une **vue matérialisée** stocke physiquement le résultat de la requête sur le disque. 

**En termes simples : C'est effectivement une copie, à un instant T, du résultat d'une requête.**

**Oui, c'est enregistré sous forme de table à part entière !**
Sous le capot, quand vous créez une vue matérialisée, le SGBD (comme Oracle ou PostgreSQL) crée une véritable table physique sur le disque dur pour stocker les données résultantes. 
- Elle occupe de l'espace de stockage (contrairement à une vue classique).
- Vous pouvez (et devez souvent) créer des **index** directement sur cette vue matérialisée pour accélérer encore plus les requêtes qui vont la lire.
- Vous pouvez la partitionner, tout comme une table normale.

### Le problème de la fraîcheur des données (Le "Refresh")
Puisque c'est une copie à un instant T, que se passe-t-il quand les tables d'origine (les tables de base) sont modifiées (INSERT, UPDATE, DELETE) ? La vue matérialisée devient obsolète !

Il faut donc la mettre à jour. C'est ce qu'on appelle le **Refresh** (Rafraîchissement). Il existe plusieurs stratégies :

1. **Refresh COMPLETE :** On efface tout le contenu de la vue matérialisée et on recalcule entièrement la requête depuis zéro. C'est très lourd et très long pour les grosses volumétries.
2. **Refresh FAST (Incrémental) :** C'est ce qui est utilisé dans votre exemple (`REFRESH FAST`). Le moteur de base de données est intelligent : il ne recalcule pas tout. Il garde une trace des modifications (les "deltas") effectuées sur les tables de base depuis le dernier rafraîchissement (souvent via des *Materialized View Logs*), et il n'applique **que ces modifications** à la vue matérialisée. C'est beaucoup plus rapide.
3. **Refresh ON DEMAND vs ON COMMIT :**
   - *ON DEMAND :* La vue est rafraîchie manuellement (par un script ou un DBA) ou planifiée à intervalles réguliers (ex: toutes les nuits à 2h du matin).
   - *ON COMMIT :* La vue est rafraîchie automatiquement et immédiatement à chaque fois qu'une transaction (COMMIT) modifie les tables de base. C'est idéal pour avoir des données toujours fraîches, mais ça ralentit considérablement les écritures (INSERT/UPDATE) sur la base de production.

### Pourquoi les utiliser ?
L'objectif principal est d'**accélérer considérablement les temps de réponse** des requêtes analytiques lourdes. Au lieu de recalculer des sommes ou des moyennes sur des millions de lignes à chaque requête, le moteur de base de données lit simplement le résultat déjà calculé dans la vue matérialisée.

---

## Exemple concret (d'après le cours)

### 1. Création de la vue matérialisée

```sql
CREATE MATERIALIZED VIEW items_summary_mv
REFRESH FAST AS
SELECT 
    a.PRD_ID, 
    a.SITE_ID, 
    a.TYPE_CODE, 
    a.CATEG_ID, 
    sum(a.GMS) AS GMS, 
    sum(a.NET_REV) AS NET_REV, 
    sum(a.BOLD_FEE) AS BOLD_FEE,
    sum(a.BIN_PRICE) AS BIN_PRICE, 
    sum(a.GLRY_FEE) AS GLRY_FEE, 
    sum(a.QTY_SOLD) AS QTY_SOLD, 
    count(a.ITEM_ID) AS UNITS 
FROM items a
GROUP BY a.PRD_ID, a.SITE_ID, a.TYPE_CODE, a.CATEG_ID;

-- Très important : calculer les statistiques pour que l'optimiseur (CBO) connaisse la vue
ANALYZE TABLE items_summary_mv COMPUTE STATISTICS;
```

**À quoi sert `ANALYZE TABLE` ici ?**
Comme nous l'avons vu dans le cours sur l'Optimiseur Basé sur les Coûts (CBO), le moteur SQL a besoin de **statistiques** pour prendre de bonnes décisions. 
Quand on vient de créer la vue matérialisée (qui est une nouvelle table physique), le CBO ne sait rien d'elle : il ne sait pas combien elle contient de lignes, ni la répartition des données dans ses colonnes. 
La commande `ANALYZE TABLE` force le moteur à scanner cette nouvelle table pour calculer ces métadonnées (nombre de lignes, valeurs distinctes, etc.). **Sans cela, le mécanisme de *Query Rewrite* (voir ci-dessous) pourrait ne pas se déclencher**, car le CBO pourrait penser à tort qu'il est plus coûteux de lire la vue que de lire la table d'origine !

*Note : `REFRESH FAST` indique que la vue ne sera pas recalculée entièrement à chaque modification de la table source, mais qu'elle sera mise à jour de manière incrémentale (uniquement les deltas).*

### 2. La requête de test

Imaginons qu'un utilisateur lance cette requête d'analyse :

```sql
SELECT categ_id, site_id, sum(net_rev), sum(bold_fee), count(item_id)
FROM items
WHERE prd_id in ('2000M05','2000M06','2001M07','2001M08')
  AND site_id in (0,1)  
  AND categ_id in (2,4,6,8,1,22)
GROUP BY categ_id, site_id;
```

### 3. L'impact sur les performances (Le "Query Rewrite")

C'est ici que la magie opère grâce à une fonctionnalité appelée **Query Rewrite** (Réécriture de requête). Si l'optimiseur est intelligent (et autorisé à le faire), il va se rendre compte que la requête de l'utilisateur peut être répondue en lisant la vue matérialisée plutôt que la table d'origine `items`.

**Cas 1 : Sans la vue matérialisée (Query Rewrite désactivé)**
```sql
ALTER SESSION SET QUERY_REWRITE_ENABLED=FALSE;
```
*   **Temps d'exécution :** `01:32:17.93` (Plus d'une heure et demie !)
*   **Plan d'exécution :** Le moteur fait un `TABLE ACCESS (FULL) OF 'ITEMS'`. Il lit toute la table brute, qui doit être gigantesque.

**Cas 2 : Avec la vue matérialisée (Query Rewrite activé)**
```sql
ALTER SESSION SET QUERY_REWRITE_ENABLED=TRUE;
```
*   **Temps d'exécution :** `00:01:40.47` (1 minute et 40 secondes !)
*   **Plan d'exécution :** Le moteur fait un `TABLE ACCESS (FULL) OF 'ITEMS_SUMMARY_MV'`. Il a automatiquement réécrit la requête pour taper dans la vue matérialisée, qui est beaucoup plus petite car elle contient déjà les données agrégées.

## En résumé

Les vues matérialisées sont un outil d'optimisation majeur en Data Warehousing. Elles permettent de passer d'un temps d'exécution de **plusieurs heures à quelques minutes** (voire secondes) en pré-calculant les agrégations coûteuses. Le mécanisme de *Query Rewrite* permet d'en bénéficier de manière transparente pour l'utilisateur final, qui continue d'interroger les tables de base.
