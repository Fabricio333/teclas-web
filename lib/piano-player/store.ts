export type Subscriber<T> = (value: T) => void;

export class WritableStore<T> {
  private _value: T;
  private _subs = new Set<Subscriber<T>>();

  constructor(initial: T) {
    this._value = initial;
  }

  subscribe(fn: Subscriber<T>): () => void {
    this._subs.add(fn);
    fn(this._value);
    return () => {
      this._subs.delete(fn);
    };
  }

  update(fn: (v: T) => T) {
    this._value = fn(this._value);
    this._subs.forEach((s) => s(this._value));
  }

  get value() {
    return this._value;
  }
}