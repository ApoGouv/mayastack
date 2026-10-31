import { describe, expect, it } from 'vitest';
import { parseRgbaColor, serializeRgbaColor } from './colors';

describe('serializeRgbaColor', () => {
  it('writes the four fields as JSON, alpha included', () => {
    expect(serializeRgbaColor({ r: 12, g: 34, b: 56, a: 0.78 })).toBe('{"r":12,"g":34,"b":56,"a":0.78}');
  });

  it('writes only the four fields of a colour object', () => {
    const color = Object.assign({ r: 1, g: 2, b: 3, a: 1 }, { h: 200 });
    expect(serializeRgbaColor(color)).toBe('{"r":1,"g":2,"b":3,"a":1}');
  });
});

describe('parseRgbaColor', () => {
  it('reads a stored colour, alpha included, and round-trips it', () => {
    for (const color of [
      { r: 0, g: 0, b: 0, a: 0 },
      { r: 255, g: 255, b: 255, a: 1 },
      { r: 12, g: 34, b: 56, a: 0.78 },
    ]) {
      expect(parseRgbaColor(serializeRgbaColor(color))).toEqual(color);
    }
    // Field order and whitespace do not matter
    expect(parseRgbaColor(' { "a": 0.5, "b": 3, "g": 2, "r": 1 } ')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
  });

  it('returns null when nothing is stored', () => {
    expect(parseRgbaColor(null)).toBeNull();
  });

  it.each([
    ['empty text', ''],
    ['malformed JSON', '{"r":1,"g":2,"b":3,"a":1'],
    ['a CSS colour', 'rgba(1, 2, 3, 1)'],
    ['a hex colour', '"#ffffff"'],
    ['null', 'null'],
    ['a number', '255'],
    ['an array', '[1,2,3,1]'],
  ])('rejects %s', (_name, stored) => {
    expect(parseRgbaColor(stored)).toBeNull();
  });

  it.each([
    ['a missing field', '{"r":1,"g":2,"b":3}'],
    ['an unexpected field', '{"r":1,"g":2,"b":3,"a":1,"h":0}'],
    ['a field replaced by another', '{"r":1,"g":2,"b":3,"alpha":1}'],
    ['an own __proto__ field', '{"r":1,"g":2,"b":3,"a":1,"__proto__":{}}'],
    ['an empty object', '{}'],
  ])('rejects %s', (_name, stored) => {
    expect(parseRgbaColor(stored)).toBeNull();
  });

  it.each([
    ['a channel above 255', '{"r":256,"g":0,"b":0,"a":1}'],
    ['a negative channel', '{"r":0,"g":-1,"b":0,"a":1}'],
    ['a fractional channel', '{"r":0,"g":0,"b":12.5,"a":1}'],
    ['a channel as text', '{"r":"255","g":0,"b":0,"a":1}'],
    ['a null channel', '{"r":null,"g":0,"b":0,"a":1}'],
    ['an infinite channel', '{"r":1e999,"g":0,"b":0,"a":1}'],
    ['alpha above 1', '{"r":0,"g":0,"b":0,"a":1.01}'],
    ['negative alpha', '{"r":0,"g":0,"b":0,"a":-0.1}'],
    ['alpha as text', '{"r":0,"g":0,"b":0,"a":"1"}'],
    ['alpha as a boolean', '{"r":0,"g":0,"b":0,"a":true}'],
    ['infinite alpha', '{"r":0,"g":0,"b":0,"a":1e999}'],
  ])('rejects %s rather than clamping or rounding it', (_name, stored) => {
    expect(parseRgbaColor(stored)).toBeNull();
  });
});
