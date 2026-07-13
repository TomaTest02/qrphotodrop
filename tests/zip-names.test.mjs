import assert from 'node:assert/strict';
import test from 'node:test';

import { createZipNamer } from '../lib/zipNames.js';

// Cele 6 nume care apar de DOUĂ ori pe evenimentul real al clientei
// (verificate în producție: 205 fișiere, doar 199 nume unice).
const DUPLICATE_REALE = [
  '1000153795.jpg', '1000153796.jpg', '1000153797.jpg',
  '1000153798.jpg', '1000153799.jpg', '1000153800.jpg',
];

// Reconstruim exact distribuția reală: 199 nume unice, dintre care 6 apar de 2 ori → 205.
function fisiereleReale() {
  const nume = [];
  for (let i = 0; i < 193; i++) nume.push(`IMG_${1000 + i}.jpg`); // 193 unice
  for (const d of DUPLICATE_REALE) nume.push(d);                  // +6  = 199 unice
  for (const d of DUPLICATE_REALE) nume.push(d);                  // +6 duplicate = 205
  return nume;
}

test('205 fișiere reale cu 6 duplicate → 205 nume UNICE în arhivă (zero pierderi)', () => {
  const fisiere = fisiereleReale();
  assert.equal(fisiere.length, 205, 'setul de test trebuie să aibă 205 fișiere');
  assert.equal(new Set(fisiere).size, 199, 'setul de test trebuie să aibă doar 199 nume unice');

  const uniqueName = createZipNamer();
  const inArhiva = fisiere.map((n, i) => uniqueName(n, i));

  // Nicio poză pierdută: câte fișiere intră, atâtea nume distincte ies.
  assert.equal(inArhiva.length, 205);
  assert.equal(new Set(inArhiva.map((n) => n.toLowerCase())).size, 205,
    'toate cele 205 fișiere trebuie să aibă nume distincte în ZIP');
});

test('determinist: primul păstrează numele, al doilea primește „ (2)", extensia rămâne', () => {
  const uniqueName = createZipNamer();
  assert.equal(uniqueName('poza.jpg', 1), 'poza.jpg');
  assert.equal(uniqueName('poza.jpg', 2), 'poza (2).jpg');
  assert.equal(uniqueName('poza.jpg', 3), 'poza (3).jpg');
  // extensii compuse / fișiere fără extensie
  assert.equal(uniqueName('clip.mov', 4), 'clip.mov');
  assert.equal(uniqueName('clip.mov', 5), 'clip (2).mov');
  assert.equal(uniqueName('fara_extensie', 6), 'fara_extensie');
  assert.equal(uniqueName('fara_extensie', 7), 'fara_extensie (2)');
});

test('coliziunile sunt case-insensitive (Windows/macOS ar suprascrie altfel)', () => {
  const uniqueName = createZipNamer();
  assert.equal(uniqueName('Foto.JPG', 1), 'Foto.JPG');
  const alDoilea = uniqueName('foto.jpg', 2);
  assert.notEqual(alDoilea.toLowerCase(), 'foto.jpg');
  assert.equal(alDoilea, 'foto (2).jpg');
});

test('nume lipsă sau gol → fallback pe id, tot unic', () => {
  const uniqueName = createZipNamer();
  assert.equal(uniqueName(null, 'abc'), 'fisier_abc');
  assert.equal(uniqueName('   ', 'def'), 'fisier_def');
  assert.equal(uniqueName(undefined, 'abc'), 'fisier_abc (2)');
});
