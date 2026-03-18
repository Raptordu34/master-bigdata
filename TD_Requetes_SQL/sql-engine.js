/* sql-engine.js — Moteur SQL.js partagé entre toutes les sections */
(function () {
    'use strict';

    window.sqlEngine = { db: null, ready: false, queue: [] };

    window.onSQLReady = function (cb) {
        if (window.sqlEngine.ready) { cb(); return; }
        window.sqlEngine.queue.push(cb);
    };

    window.runSQL = function (query) {
        if (!window.sqlEngine.db) throw new Error('Base de données non initialisée. Patientez…');
        return window.sqlEngine.db.exec(query);
    };

    var SCHEMA = `
CREATE TABLE departements (
    id          INTEGER PRIMARY KEY,
    nom         TEXT    NOT NULL,
    budget      REAL,
    localisation TEXT
);
CREATE TABLE employes (
    id              INTEGER PRIMARY KEY,
    nom             TEXT NOT NULL,
    prenom          TEXT NOT NULL,
    salaire         REAL,
    departement_id  INTEGER,
    date_embauche   TEXT,
    poste           TEXT
);
CREATE TABLE projets (
    id              INTEGER PRIMARY KEY,
    nom             TEXT NOT NULL,
    budget          REAL,
    date_debut      TEXT,
    date_fin        TEXT,
    departement_id  INTEGER
);
CREATE TABLE affectations (
    employe_id  INTEGER,
    projet_id   INTEGER,
    role        TEXT,
    heures      INTEGER,
    PRIMARY KEY (employe_id, projet_id)
);

INSERT INTO departements VALUES (1, 'Informatique',        500000, 'Paris');
INSERT INTO departements VALUES (2, 'Ressources Humaines', 200000, 'Lyon');
INSERT INTO departements VALUES (3, 'Finance',             350000, 'Paris');
INSERT INTO departements VALUES (4, 'Marketing',           280000, 'Bordeaux');

INSERT INTO employes VALUES (1,  'Dupont',    'Alice',    62000, 1, '2019-03-15', 'Développeur Senior');
INSERT INTO employes VALUES (2,  'Martin',    'Bob',      48000, 1, '2021-06-01', 'Développeur Junior');
INSERT INTO employes VALUES (3,  'Bernard',   'Claire',   75000, 1, '2017-09-10', 'Architecte');
INSERT INTO employes VALUES (4,  'Leroy',     'David',    41000, 2, '2022-01-20', 'Chargé RH');
INSERT INTO employes VALUES (5,  'Petit',     'Emma',     52000, 2, '2020-05-12', 'Responsable RH');
INSERT INTO employes VALUES (6,  'Grand',     'François', 38000, 2, '2023-02-28', 'Chargé RH');
INSERT INTO employes VALUES (7,  'Simon',     'Gaëlle',   80000, 3, '2015-11-03', 'Directrice Finance');
INSERT INTO employes VALUES (8,  'Michel',    'Hugo',     58000, 3, '2018-07-22', 'Analyste Financier');
INSERT INTO employes VALUES (9,  'Fontaine',  'Iris',     45000, 3, '2021-10-01', 'Comptable');
INSERT INTO employes VALUES (10, 'Renard',    'Julien',   43000, 4, '2022-04-15', 'Chef de Projet');
INSERT INTO employes VALUES (11, 'Lambert',   'Karine',   55000, 4, '2019-08-30', 'Responsable Marketing');
INSERT INTO employes VALUES (12, 'Chevalier', 'Louis',    39000, 4, '2023-01-10', 'Chargé Communication');
INSERT INTO employes VALUES (13, 'Rousseau',  'Marie',    67000, 1, '2018-04-05', 'Chef de Projet IT');
INSERT INTO employes VALUES (14, 'Blanc',     'Nicolas',  71000, 3, '2016-12-01', 'Contrôleur de Gestion');
INSERT INTO employes VALUES (15, 'Noir',      'Olivia',   44000, 2, '2023-06-15', 'Chargé RH');

INSERT INTO projets VALUES (1, 'Alpha',   120000, '2023-01-01', '2023-12-31', 1);
INSERT INTO projets VALUES (2, 'Beta',     80000, '2023-03-01', '2024-02-28', 1);
INSERT INTO projets VALUES (3, 'Gamma',    45000, '2023-06-01', '2023-11-30', 2);
INSERT INTO projets VALUES (4, 'Delta',   200000, '2022-09-01', '2024-08-31', 3);
INSERT INTO projets VALUES (5, 'Epsilon',  60000, '2023-07-01', '2024-01-31', 4);
INSERT INTO projets VALUES (6, 'Zeta',     90000, '2024-01-01', '2024-12-31', 1);

INSERT INTO affectations VALUES (1,  1, 'Lead Développeur',   320);
INSERT INTO affectations VALUES (2,  1, 'Développeur',        280);
INSERT INTO affectations VALUES (3,  1, 'Architecte',         120);
INSERT INTO affectations VALUES (13, 1, 'Chef de Projet',     200);
INSERT INTO affectations VALUES (1,  2, 'Développeur',        180);
INSERT INTO affectations VALUES (2,  2, 'Développeur',        240);
INSERT INTO affectations VALUES (13, 2, 'Chef de Projet',     160);
INSERT INTO affectations VALUES (5,  3, 'Coordinateur',       100);
INSERT INTO affectations VALUES (4,  3, 'Analyste',            80);
INSERT INTO affectations VALUES (7,  4, 'Sponsor',             40);
INSERT INTO affectations VALUES (8,  4, 'Analyste Principal', 300);
INSERT INTO affectations VALUES (9,  4, 'Comptable',          260);
INSERT INTO affectations VALUES (14, 4, 'Contrôleur',         220);
INSERT INTO affectations VALUES (10, 5, 'Chef de Projet',     200);
INSERT INTO affectations VALUES (11, 5, 'Marketing',          180);
INSERT INTO affectations VALUES (12, 5, 'Communication',      150);
INSERT INTO affectations VALUES (1,  6, 'Développeur',        100);
INSERT INTO affectations VALUES (3,  6, 'Architecte',          80);
INSERT INTO affectations VALUES (2,  6, 'Développeur',        120);
INSERT INTO affectations VALUES (13, 6, 'Chef de Projet',     140);
`;

    initSqlJs({
        locateFile: function (f) {
            return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/' + f;
        }
    }).then(function (SQL) {
        var db = new SQL.Database();
        db.run(SCHEMA);
        window.sqlEngine.db = db;
        window.sqlEngine.ready = true;
        window.sqlEngine.queue.forEach(function (cb) { cb(); });
        window.sqlEngine.queue = [];
    }).catch(function (err) {
        console.error('[sql-engine] Erreur initialisation SQL.js :', err);
        window.sqlEngine.error = err.message;
    });
})();
