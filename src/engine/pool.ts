/**
 * Generic pool over a fixed-size array of T. Index-based, allocation-free
 * after construction. Caller is responsible for reset() of items via the
 * factory.
 *
 * Active items are kept compact at indices [0, size). On release, we swap with
 * the last active and decrement size — O(1).
 */
export class Pool<T> {
  readonly items: T[];
  readonly capacity: number;
  private _size = 0;

  constructor(capacity: number, factory: () => T) {
    this.capacity = capacity;
    this.items = new Array<T>(capacity);
    for (let i = 0; i < capacity; i++) this.items[i] = factory();
  }

  get size(): number {
    return this._size;
  }

  get free(): number {
    return this.capacity - this._size;
  }

  /** Returns the next-available item or null if at capacity. Item position becomes `size-1`. */
  acquire(): T | null {
    if (this._size >= this.capacity) return null;
    const item = this.items[this._size]!;
    this._size++;
    return item;
  }

  /** Releases the item at index `i` (must be in [0, size)). */
  releaseAt(i: number): void {
    const last = this._size - 1;
    if (i < 0 || i > last) return;
    if (i !== last) {
      const tmp = this.items[i]!;
      this.items[i] = this.items[last]!;
      this.items[last] = tmp;
    }
    this._size--;
  }

  clear(): void {
    this._size = 0;
  }
}
