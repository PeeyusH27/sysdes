// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Typeahead } from './Typeahead.jsx';

const ITEMS = [{ id: 1, label: 'React' }, { id: 2, label: 'React Native' }];

test('type, arrow down, Enter: the combobox pattern end to end', async () => {
  const onSelect = vi.fn();
  const { unmount } = render(<Typeahead fetchSuggestions={async () => ITEMS} onSelect={onSelect} />);
  const input = screen.getByRole('combobox', { name: 'Search' });
  expect(input.getAttribute('aria-expanded')).toBe('false');

  fireEvent.change(input, { target: { value: 'rea' } });
  const options = await screen.findAllByRole('option');               // appears after the 250 ms debounce
  expect(options.map(o => o.textContent)).toEqual(['React', 'React Native']);
  expect(options[0].querySelector('mark').textContent).toBe('Rea');
  expect(input.getAttribute('aria-expanded')).toBe('true');

  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id);
  expect(options[0].getAttribute('aria-selected')).toBe('true');

  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onSelect).toHaveBeenCalledWith(ITEMS[0]);
  expect(input.value).toBe('React');
  expect(input.getAttribute('aria-expanded')).toBe('false');
  unmount();
});

test('mouse selection keeps focus in the input; Escape closes', async () => {
  const onSelect = vi.fn();
  const { unmount } = render(<Typeahead fetchSuggestions={async () => ITEMS} onSelect={onSelect} />);
  const input = screen.getByRole('combobox');

  fireEvent.change(input, { target: { value: 'rea' } });
  let options = await screen.findAllByRole('option');
  expect(fireEvent.mouseDown(options[1])).toBe(false);                // default prevented: the input never blurs
  fireEvent.click(options[1]);
  expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);

  fireEvent.change(input, { target: { value: 'reac' } });
  options = await screen.findAllByRole('option');
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryAllByRole('option')).toHaveLength(0);           // the hidden listbox leaves the accessibility tree
  unmount();
});
