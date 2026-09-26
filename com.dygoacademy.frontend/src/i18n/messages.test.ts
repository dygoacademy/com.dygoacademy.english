import { TYPE, parse, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { describe, expect, it } from 'vitest';

import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import zhCN from '../../messages/zh-CN.json';

/**
 * UI-L key parity: every key in en.json exists in vi.json and zh-CN.json
 * (and nothing else does), and each message uses the same ICU arguments
 * and rich-text tags, so t('key', values) works in all three languages.
 * `_meta` (the zh-CN "draft, needs native review" header) is ignored.
 */
type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    if (!prefix && key === '_meta') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else flatten(value, path).forEach((v, k) => out.set(k, v));
  }
  return out;
}

/** Argument names and tag names a message uses, e.g. ["arg:count", "tag:b"]. */
function signature(message: string): string[] {
  const found = new Set<string>();
  const walk = (elements: MessageFormatElement[]) => {
    for (const el of elements) {
      if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) {
        found.add(`arg:${el.value}`);
      } else if (el.type === TYPE.plural || el.type === TYPE.select) {
        found.add(`arg:${el.value}`);
        Object.values(el.options).forEach((option) => walk(option.value));
      } else if (el.type === TYPE.tag) {
        found.add(`tag:${el.value}`);
        walk(el.children);
      }
    }
  };
  walk(parse(message, { ignoreTag: false }));
  return [...found].sort();
}

const source = flatten(en as Tree);

describe.each([
  ['vi', vi as Tree],
  ['zh-CN', zhCN as Tree],
])('messages/%s.json', (_name, messages) => {
  const target = flatten(messages);

  it('has exactly the keys of en.json', () => {
    expect([...target.keys()].sort()).toEqual([...source.keys()].sort());
  });

  it('uses the same ICU arguments and tags in every message', () => {
    const mismatches = [...source]
      .filter(([key, message]) => target.has(key))
      .filter(([key, message]) => signature(message).join() !== signature(target.get(key)!).join())
      .map(([key]) => key);
    expect(mismatches).toEqual([]);
  });
});

describe('messages/zh-CN.json', () => {
  it('is marked as a draft that needs a native review', () => {
    expect((zhCN as { _meta?: { status?: string } })._meta?.status).toBe(
      'draft, needs native review',
    );
  });
});
