import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanMultiline,
  cleanSingleLine,
  escapeHtml,
  isValidEmail,
} from '../lib/textSecurity.js';

test('escapeHtml neutralizează taguri și atribute injectate în email', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)"> & test'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; test',
  );
});

test('câmpurile single-line resping newline/NUL și limitele sunt impuse după trim', () => {
  assert.equal(cleanSingleLine('  Ana  ', 10), 'Ana');
  assert.equal(cleanSingleLine('Ana\nBcc: x@y.ro', 100), null);
  assert.equal(cleanSingleLine('a\0b', 100), null);
  assert.equal(cleanSingleLine('123456', 5), null);
  assert.equal(cleanSingleLine(123, 10), null);
});

test('mesajele multiline păstrează liniile, dar resping NUL și supradimensiunea', () => {
  assert.equal(cleanMultiline('  Bună\nLume  ', 20), 'Bună\nLume');
  assert.equal(cleanMultiline('a\0b', 20), null);
  assert.equal(cleanMultiline('abcdef', 5), null);
});

test('emailul are format și lungime rezonabile', () => {
  assert.equal(isValidEmail('ana@example.ro'), true);
  assert.equal(isValidEmail('ana@localhost'), false);
  assert.equal(isValidEmail(`${'a'.repeat(250)}@x.ro`), false);
});
