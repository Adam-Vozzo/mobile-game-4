import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config, DEFAULTS } from '../src/config';
import { events } from '../src/engine/events';
import { ScorePopup } from '../src/ui/score-popup';

type FakeEl = {
  className: string;
  textContent: string;
  style: Record<string, string>;
  remove: ReturnType<typeof vi.fn>;
};

const makeEl = (): FakeEl => ({
  className: '',
  textContent: '',
  style: {},
  remove: vi.fn(),
});

const makeHost = () => {
  const children: FakeEl[] = [];
  return {
    appendChild: vi.fn((el: FakeEl) => children.push(el)),
    _children: children,
  };
};

const killEvent = (overrides: Partial<{
  x: number; y: number; r: number; g: number; b: number; pointValue: number; multiplier: number;
}> = {}) => ({
  x: 100, y: 200, r: 1, g: 0.17, b: 0.84, pointValue: 25, multiplier: 1,
  enemyType: 'wanderer' as const,
  ...overrides,
});

describe('ui/score-popup', () => {
  let fakeEl: FakeEl;
  let popup: ScorePopup;
  let host: ReturnType<typeof makeHost>;

  beforeEach(() => {
    vi.useFakeTimers();
    config.juice.scorePopups = DEFAULTS.juice.scorePopups;

    fakeEl = makeEl();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => fakeEl),
    });

    host = makeHost();
    popup = new ScorePopup(host as never);
  });

  afterEach(() => {
    popup.destroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not append an element when toggle is off', () => {
    config.juice.scorePopups = false;
    events.emit('kill', killEvent());
    expect(host.appendChild).not.toHaveBeenCalled();
  });

  it('appends an element to host on kill when toggle is on', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent());
    expect(host.appendChild).toHaveBeenCalledWith(fakeEl);
  });

  it('shows the base point value when multiplier is 1', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent({ pointValue: 25, multiplier: 1 }));
    expect(fakeEl.textContent).toBe('+25');
  });

  it('shows pointValue × multiplier when combo is active', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent({ pointValue: 50, multiplier: 4 }));
    expect(fakeEl.textContent).toBe('+200');
  });

  it('applies enemy colour as CSS color', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent({ r: 1, g: 0, b: 0 }));
    expect(fakeEl.style.color).toBe('rgb(255,0,0)');
  });

  it('applies a coloured text-shadow for glow', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent({ r: 0, g: 1, b: 0.67 }));
    expect(fakeEl.style.textShadow).toContain('rgb(0,255,171)');
  });

  it('sets left/top CSS from world kill coordinates', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent({ x: 300, y: 450 }));
    expect(fakeEl.style.left).toBe('300px');
    expect(fakeEl.style.top).toBe('450px');
  });

  it('removes the element after animation duration', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent());
    expect(fakeEl.remove).not.toHaveBeenCalled();
    vi.advanceTimersByTime(900);
    expect(fakeEl.remove).toHaveBeenCalled();
  });

  it('unsubscribes from kill events on destroy()', () => {
    config.juice.scorePopups = true;
    popup.destroy();
    host.appendChild.mockClear();
    events.emit('kill', killEvent());
    expect(host.appendChild).not.toHaveBeenCalled();
    // Prevent afterEach double-destroy.
    popup = new ScorePopup(host as never);
  });

  it('assigns score-popup CSS class to the element', () => {
    config.juice.scorePopups = true;
    events.emit('kill', killEvent());
    expect(fakeEl.className).toBe('score-popup');
  });
});
