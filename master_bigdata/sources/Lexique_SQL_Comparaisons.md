# Lexique : ON, IN, =, et les autres

## 1. Le `=` (L'égalité simple)
*   **Où ?** Dans la clause `WHERE` ou `HAVING`.
*   **Usage :** On compare une colonne à **UNE SEULE** valeur.
*   **Exemple :** `WHERE NOM = 'Hitchcock'`.
*   **Attention :** Si vous écrivez `WHERE ID = (SELECT ...)` et que la sous-requête renvoie 2 lignes, SQL renverra une erreur.

## 2. Le `IN` (L'appartenance à une liste)
*   **Où ?** Dans la clause `WHERE`.
*   **Usage :** On compare une colonne à une **LISTE** de valeurs (soit écrite en dur, soit venant d'une sous-requête).
*   **Métaphore :** C'est comme demander : "Est-ce que cette clé est dans ce trousseau ?"
*   **Exemple :** `WHERE IDFILM IN (1, 5, 12)` ou `WHERE IDFILM IN (SELECT ...)`

## 3. Le `ON` (Le pont de la jointure)
*   **Où ?** Uniquement attaché à un `JOIN`.
*   **Usage :** Il définit la **condition de rencontre** entre deux tables. Il ne sert pas à filtrer une valeur précise, mais à dire comment "coller" les lignes.
*   **Exemple :** `FROM FILM JOIN ARTISTE ON FILM.IDREAL = ARTISTE.ID`
*   **Analogie :** Si les tables sont des pièces de puzzle, le `ON` décrit la forme des encoches pour qu'elles s'emboîtent.

---

## Résumé Comparatif

| Mot-clé | Type de comparaison | Contexte typique |
| :--- | :--- | :--- |
| **`=`** | Valeur unique exacte | Filtrer un résultat précis. |
| **`IN`** | Multiples valeurs possibles | Filtrer par rapport à un groupe. |
| **`ON`** | Relation entre deux colonnes | Lier deux tables dans un `JOIN`. |
| **`LIKE`** | Recherche textuelle floue | `WHERE NOM LIKE 'Hitch%'` (commence par). |
| **`ANY / ALL`** | Comparaison complexe | `WHERE PRIX > ALL (SELECT...)` (plus cher que tous). |

## Le cas particulier : La vieille syntaxe
Dans l'exercice 2 du TD, on voit souvent :
`FROM FILM F, ARTISTE A WHERE F.IDREAL = A.IDREAL`
Ici, le `=` est utilisé **à la place du ON** car c'est une vieille syntaxe (norme SQL-89). Aujourd'hui, on préfère séparer la jointure (`ON`) du filtrage (`WHERE`).
