import { describe, it, expect } from 'vitest';
import { Pool } from '../src/engine/pool';

describe('engine/pool', () => {
  it('acquires up to capacity then returns null', () => {
    const p = new Pool(4, () => ({ v: 0 }));
    expect(p.size).toBe(0);
    expect(p.free).toBe(4);
    for (let i = 0; i < 4; i++) {
      const item = p.acquire();
      expect(item).not.toBeNull();
      item!.v = i;
    }
    expect(p.size).toBe(4);
    expect(p.acquire()).toBeNull();
  });

  it('releaseAt swaps with last and shrinks size', () => {
    const p = new Pool(4, () => ({ v: 0 }));
    const a = p.acquire()!;
    const b = p.acquire()!;
    const c = p.acquire()!;
    a.v = 1;
    b.v = 2;
    c.v = 3;
    p.releaseAt(0); // releases `a`; `c` should now sit at index 0
    expect(p.size).toBe(2);
    expect(p.items[0]!.v).toBe(3);
  });

  it('clear empties the active range without freeing items', () => {
    const p = new Pool(4, () => ({ v: 0 }));
    p.acquire();
    p.acquire();
    p.clear();
    expect(p.size).toBe(0);
    expect(p.free).toBe(4);
    expect(p.items.length).toBe(4);
  });

  it('does no allocation on acquire after construction', () => {
    const p = new Pool(8, () => ({ v: 0 }));
    const ids = new Set<object>();
    for (let i = 0; i < 8; i++) ids.add(p.acquire()!);
    p.clear();
    for (let i = 0; i < 8; i++) {
      const x = p.acquire()!;
      expect(ids.has(x)).toBe(true);
    }
  });
});
