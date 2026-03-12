# Cours-Master-BigDATA

**Type :** compte-rendu
**Créé le :** 2026-03-08

## Instructions LLM

**Design system :** lire `./design/DESIGN_SYSTEM.md`
**SVG catalog :** lire `./design/svg/CATALOG.md` avant d’ajouter tout élément graphique
**Prompt template :** lire `./PROMPT.md`
**Exemple de section :** voir `section-EXAMPLE.html` dans ce dossier
**Sources :** exploiter en priorité le dossier `./sources/` quand des fichiers y sont présents

## Règle principale
Génère uniquement des fichiers `section-*.html` dans ce dossier.
Ne modifie pas `index.html`, les fichiers CSS, ni les assets du learning-kit.

## Workflow
1. Lire DESIGN_SYSTEM.md
2. Lire PROMPT.md
3. Consulter section-EXAMPLE.html
4. Lire les sources importées dans ./sources/ si elles existent
5. Générer section-[nom].html
6. Proposer les boutons nav à ajouter dans index.html (section nav-links)