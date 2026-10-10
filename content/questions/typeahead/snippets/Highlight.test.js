import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Highlight, splitHighlight } from './Highlight.jsx';

test('matches case-insensitively and keeps the label casing', () => {
  expect(splitHighlight('React Native', 're')).toEqual([
    { text: 'Re', match: true },
    { text: 'act Native', match: false },
  ]);
});

test('marks every occurrence, including adjacent ones', () => {
  expect(splitHighlight('Prerender', 'RE')).toEqual([
    { text: 'P', match: false },
    { text: 're', match: true },
    { text: 're', match: true },
    { text: 'nder', match: false },
  ]);
});

test('treats regex characters in the query literally', () => {
  expect(splitHighlight('C++ tutorial', 'c++')).toEqual([
    { text: 'C++', match: true },
    { text: ' tutorial', match: false },
  ]);
  expect(splitHighlight('axb or a.b', 'a.b')).toEqual([
    { text: 'axb or ', match: false },
    { text: 'a.b', match: true },
  ]);
});

test('a blank query or no match leaves the text whole', () => {
  expect(splitHighlight('React', '  ')).toEqual([{ text: 'React', match: false }]);
  expect(splitHighlight('React', 'vue')).toEqual([{ text: 'React', match: false }]);
  expect(splitHighlight('', 're')).toEqual([]);
});

test('HTML inside a label is rendered as text, never as markup', () => {
  const html = renderToStaticMarkup(createElement(Highlight, { text: '<img src=x onerror=alert(1)> react', query: 'react' }));
  expect(html).toBe('&lt;img src=x onerror=alert(1)&gt; <mark>react</mark>');
});
