import { describe, expect, it } from 'vitest';
import { toEnglish } from '../src/ui/i18n';
import { ITEMS, FALLBACK_ITEM } from '../src/data/items';
import { ENEMIES, BOSS_NAMES, BOSS_TAGLINES } from '../src/data/enemies';
import { GOLOSINA_EFFECTS } from '../src/data/golosinas';
import { SETS } from '../src/data/sets';
import { CHARACTERS } from '../src/data/characters';
import { CARTELES } from '../src/core/meta';
import { ACTS } from '../src/data/acts';
import { statRows } from '../src/ui/statInfo';
import { computeStats } from '../src/core/stats';

describe('inglés', () => {
  it('todo el contenido del juego tiene traducción', () => {
    const texts: string[] = [];
    for (const i of [...ITEMS, FALLBACK_ITEM]) texts.push(i.name, i.desc);
    for (const e of Object.values(ENEMIES)) texts.push(e.name);
    texts.push(...Object.values(BOSS_NAMES), ...Object.values(BOSS_TAGLINES));
    for (const g of Object.values(GOLOSINA_EFFECTS)) texts.push(g.name);
    for (const s of SETS) texts.push(s.name, s.desc);
    for (const c of CHARACTERS) texts.push(c.desc);
    for (const c of CARTELES) texts.push(c.name, c.desc, ...(c.reward ? [c.reward] : []));
    for (const a of ACTS) texts.push(a.name, a.intro);
    for (const r of statRows(computeStats([]))) texts.push(r.label);
    const missing = [...new Set(texts)].filter((s) => toEnglish(s) === s && !/^[A-Z][a-z]+$/.test(s));
    expect(missing).toEqual([]);
  });

  it('traduce también textos con datos', () => {
    expect(toEnglish('Número 2 de 3')).toBe('Act 2 of 3');
    expect(toEnglish('Te espera Madame Fortuna')).toBe('Madame Fortune awaits you');
  });
});
