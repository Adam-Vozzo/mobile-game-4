import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config, DEFAULTS } from '../src/config';

// Fake DOM element returned by document.createElement.
type FakeEl = {
  id: string;
  textContent: string;
  offsetWidth: number;
  classList: { names: Set<string>; add(c: string): void; remove(c: string): void };
  setAttribute: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

const makeEl = (): FakeEl => {
  const el: FakeEl = {
    id: '',
    textContent: '',
    offsetWidth: 0,
    classList: {
      names: new Set<string>(),
      add(c: string) { this.names.add(c); },
      remove(c: string) { this.names.delete(c); },
    },
    setAttribute: vi.fn(),
    remove: vi.fn(),
  };
  return el;
};

const makeHost = () => ({
  appendChild: vi.fn(),
});

describe('ui/combo-counter', () => {
  let ComboCounter: typeof import('../src/ui/combo-counter').ComboCounter;
  let fakeEl: FakeEl;

  beforeEach(async () => {
    vi.resetModules();
    // Reset config to defaults before each test.
    config.juice.comboCounter = DEFAULTS.juice.comboCounter;

    fakeEl = makeEl();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => fakeEl),
    });

    ({ ComboCounter } = await import('../src/ui/combo-counter'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('appends an element to the host on construction', () => {
    const host = makeHost();
    new ComboCounter(host as never);
    expect(host.appendChild).toHaveBeenCalledWith(fakeEl);
  });

  it('does not trigger animation when toggle is off (default)', () => {
    const cc = new ComboCounter(makeHost() as never);
    cc.update(2); // mult went from 1→2 but toggle is off
    expect(fakeEl.classList.names.has('combo-pop')).toBe(false);
  });

  it('triggers animation when mult increases and toggle is on', () => {
    config.juice.comboCounter = true;
    const cc = new ComboCounter(makeHost() as never);
    cc.update(2);
    expect(fakeEl.classList.names.has('combo-pop')).toBe(true);
    expect(fakeEl.textContent).toBe('×2');
  });

  it('does not trigger when mult is 1 (initial value)', () => {
    config.juice.comboCounter = true;
    const cc = new ComboCounter(makeHost() as never);
    cc.update(1); // stays at 1
    expect(fakeEl.classList.names.has('combo-pop')).toBe(false);
  });

  it('does not trigger when mult decreases', () => {
    config.juice.comboCounter = true;
    const cc = new ComboCounter(makeHost() as never);
    cc.update(3); // 1→3 — triggers
    fakeEl.classList.names.clear(); // clear to detect next trigger
    cc.update(2); // 3→2 — should not trigger
    expect(fakeEl.classList.names.has('combo-pop')).toBe(false);
  });

  it('updates text to current multiplier on each increase', () => {
    config.juice.comboCounter = true;
    const cc = new ComboCounter(makeHost() as never);
    cc.update(3);
    expect(fakeEl.textContent).toBe('×3');
    cc.update(5);
    expect(fakeEl.textContent).toBe('×5');
  });

  it('reset() removes combo-pop class and resets lastMult', () => {
    vi.useFakeTimers();
    config.juice.comboCounter = true;
    const cc = new ComboCounter(makeHost() as never);
    cc.update(2);
    expect(fakeEl.classList.names.has('combo-pop')).toBe(true);
    cc.reset();
    expect(fakeEl.classList.names.has('combo-pop')).toBe(false);
    // After reset, mult of 2 should fire again (lastMult reset to 1).
    cc.update(2);
    expect(fakeEl.classList.names.has('combo-pop')).toBe(true);
  });

  it('destroy() removes element from DOM', () => {
    const cc = new ComboCounter(makeHost() as never);
    cc.destroy();
    expect(fakeEl.remove).toHaveBeenCalled();
  });

  it('re-triggers animation when mult increases again after decay', () => {
    config.juice.comboCounter = true;
    const cc = new ComboCounter(makeHost() as never);
    cc.update(3);
    // Mult decays back to 1.
    cc.update(1);
    fakeEl.classList.names.clear();
    // Then chains again.
    cc.update(2);
    expect(fakeEl.classList.names.has('combo-pop')).toBe(true);
  });

  it('clears pending fade timer on reset() to prevent post-reset DOM mutation', () => {
    vi.useFakeTimers();
    config.juice.comboCounter = true;
    const cc = new ComboCounter(makeHost() as never);
    cc.update(2);
    cc.reset();
    // Advance time — timer should NOT fire after reset.
    vi.advanceTimersByTime(2000);
    // combo-pop should still be absent (reset cleared it and the timer).
    expect(fakeEl.classList.names.has('combo-pop')).toBe(false);
  });
});
