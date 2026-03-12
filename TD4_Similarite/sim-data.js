/* sim-data.js — Données TD4 Scolarité (données réelles des exercices) */
'use strict';

const SimDB = {
  Student: [
    { RID: 1, StudId: 101, Name: 'Ali',     Level: 'HCSC' },
    { RID: 2, StudId: 202, Name: 'Craig',   Level: 'MCSC' },
    { RID: 3, StudId: 303, Name: 'Daniel',  Level: 'HCSC' },
    { RID: 4, StudId: 404, Name: 'Ankit',   Level: 'MCSC' },
    { RID: 5, StudId: 505, Name: 'Philip',  Level: 'MSC'  },
    { RID: 6, StudId: 606, Name: 'Nicolas', Level: 'HCSC' },
  ],

  Course: [
    { RID: 1, CourId: 'C306', Name: 'Comm',  Dept: 'Comp' },
    { RID: 2, CourId: 'C422', Name: 'AI',    Dept: 'Comp' },
    { RID: 3, CourId: 'M301', Name: 'Calc',  Dept: 'Math' },
    { RID: 4, CourId: 'C442', Name: 'IDBI',  Dept: 'Comp' },
    { RID: 5, CourId: 'S402', Name: 'BioS',  Dept: 'Stat' },
    { RID: 6, CourId: 'M444', Name: 'Algeb', Dept: 'Math' },
    { RID: 7, CourId: 'S466', Name: 'Stat',  Dept: 'Stat' },
  ],

  Grades: [
    { RID:  1, CourId: 'C306', StudId: 101, Grade: 'A+' },
    { RID:  2, CourId: 'C306', StudId: 202, Grade: 'A+' },
    { RID:  3, CourId: 'C306', StudId: 303, Grade: 'A'  },
    { RID:  4, CourId: 'C306', StudId: 404, Grade: 'B+' },
    { RID:  5, CourId: 'C306', StudId: 505, Grade: 'A+' },
    { RID:  6, CourId: 'C306', StudId: 606, Grade: 'A-' },
    { RID:  7, CourId: 'C422', StudId: 101, Grade: 'A+' },
    { RID:  8, CourId: 'C442', StudId: 101, Grade: 'A+' },
    { RID:  9, CourId: 'S402', StudId: 101, Grade: 'B+' },
    { RID: 10, CourId: 'C422', StudId: 202, Grade: 'A-' },
    { RID: 11, CourId: 'M444', StudId: 202, Grade: 'B-' },
    { RID: 12, CourId: 'M301', StudId: 202, Grade: 'B'  },
    { RID: 13, CourId: 'C442', StudId: 202, Grade: 'A+' },
    { RID: 14, CourId: 'M301', StudId: 303, Grade: 'A-' },
    { RID: 15, CourId: 'C442', StudId: 303, Grade: 'A+' },
    { RID: 16, CourId: 'S402', StudId: 303, Grade: 'B'  },
    { RID: 17, CourId: 'S402', StudId: 404, Grade: 'A'  },
    { RID: 18, CourId: 'S466', StudId: 404, Grade: 'B+' },
    { RID: 19, CourId: 'C442', StudId: 404, Grade: 'B+' },
    { RID: 20, CourId: 'M444', StudId: 404, Grade: 'B'  },
    { RID: 21, CourId: 'C442', StudId: 505, Grade: 'A+' },
    { RID: 22, CourId: 'C442', StudId: 505, Grade: 'A+' },
    { RID: 23, CourId: 'S466', StudId: 505, Grade: 'A'  },
    { RID: 24, CourId: 'S466', StudId: 606, Grade: 'B-' },
    { RID: 25, CourId: 'M444', StudId: 606, Grade: 'A+' },
    { RID: 26, CourId: 'C442', StudId: 606, Grade: 'A+' },
    { RID: 27, CourId: 'S402', StudId: 606, Grade: 'B'  },
  ],

  // ── BJI : pour chaque valeur de dimension → [RIDs Grades qualifiants] ──
  // JI₁ : Grades.StudId = Student.StudId — indexé par Student.Level
  // JI₂ : Grades.CourId = Course.CourId  — indexé par Course.Dept
  BJI: {
    JI1: {
      'HCSC': [1, 3, 6, 7, 8, 9, 14, 15, 16, 24, 25, 26, 27],
      'MCSC': [2, 4, 10, 11, 12, 13, 17, 18, 19, 20],
      'MSC':  [5, 21, 22, 23],
    },
    JI2: {
      'Comp': [1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 15, 19, 21, 22, 26],
      'Math': [11, 12, 14, 20, 25],
      'Stat': [9, 16, 17, 18, 23, 24, 27],
    },
    // Mapping Student RID → [Grades RIDs] (pour animation BJI)
    studentToGrades: {
      1: [1, 7, 8, 9],
      2: [2, 10, 11, 12, 13],
      3: [3, 14, 15, 16],
      4: [4, 17, 18, 19, 20],
      5: [5, 21, 22, 23],
      6: [6, 24, 25, 26, 27],
    },
    // Mapping Course RID → [Grades RIDs]
    courseToGrades: {
      1: [1, 2, 3, 4, 5, 6],
      2: [7, 10],
      3: [12, 14],
      4: [8, 13, 15, 19, 21, 22, 26],
      5: [9, 16, 17, 27],
      6: [11, 20, 25],
      7: [18, 23, 24],
    },
  },

  // ── Partitionnement horizontal dérivé ──
  Fragments: {
    Student: [
      { name: 'F₁_HCSC', predicate: "Level = 'HCSC'", rids: [1, 3, 6],    color: '#5ba6a0' },
      { name: 'F₂_MCSC', predicate: "Level = 'MCSC'", rids: [2, 4],       color: '#d67556' },
      { name: 'F₃_MSC',  predicate: "Level = 'MSC'",  rids: [5],          color: '#a78bfa' },
    ],
    // Grades fragments dérivés de Student (partitionnement dérivé)
    GradesFromStudent: [
      { name: 'G_HCSC', derivedFrom: "Level='HCSC'", rids: [1,3,6,7,8,9,14,15,16,24,25,26,27], color: '#5ba6a0' },
      { name: 'G_MCSC', derivedFrom: "Level='MCSC'", rids: [2,4,10,11,12,13,17,18,19,20],      color: '#d67556' },
      { name: 'G_MSC',  derivedFrom: "Level='MSC'",  rids: [5,21,22,23],                       color: '#a78bfa' },
    ],
    Course: [
      { name: 'C_Comp', predicate: "Dept = 'Comp'", rids: [1, 2, 4], color: '#9e9a94' },
      { name: 'C_Math', predicate: "Dept = 'Math'", rids: [3, 6],    color: '#facc15' },
      { name: 'C_Stat', predicate: "Dept = 'Stat'", rids: [5, 7],    color: '#d67556' },
    ],
    // Fragment final dérivé : G_HCSC ∩ C_Stat
    GradesFinal: [
      { name: 'G_HCSC_Stat', predicates: ["Level='HCSC'", "Dept='Stat'"], rids: [9,16,24,27], color: '#d67556' },
    ],
  },
};

// Export pour usage module ou script classique
if (typeof module !== 'undefined') module.exports = { SimDB };
