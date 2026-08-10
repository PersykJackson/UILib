import { subscribersMap } from './subscribe';
import { PrivateValue } from './PrivateValue';

const parentsMap = new WeakMap<object, Set<object>>();
const observableObjects = new WeakSet<object>();

const notify = (target: object, visited = new Set<object>()) => {
  if (visited.has(target)) return;
  visited.add(target);

  subscribersMap.get(target)?.forEach((cb) => cb());

  parentsMap.get(target)?.forEach((parent) => notify(parent, visited));
};

const linkParent = (child: unknown, parent: object) => {
  if (child && typeof child === 'object') {
    makeObservable(child as object);

    if (!parentsMap.has(child as object)) {
      parentsMap.set(child as object, new Set());
    }
    parentsMap.get(child as object)!.add(parent);
  }
};

const unlinkParent = (child: unknown, parent: object) => {
  if (child && typeof child === 'object') {
    parentsMap.get(child as object)?.delete(parent);
  }
};

export const makeObservable = <T extends object>(obj: T): T => {
  if (!obj || typeof obj !== 'object' || observableObjects.has(obj)) {
    return obj;
  }
  observableObjects.add(obj);

  const keys = Object.getOwnPropertyNames(obj) as (keyof T)[];

  keys.forEach((key) => {
    let value = obj[key];

    if (typeof value === 'function' || value instanceof PrivateValue) return;

    if (value && typeof value === 'object') {
      linkParent(value, obj);
    }

    Object.defineProperty(obj, key, {
      get() {
        return value;
      },
      set(newValue) {
        if (value !== newValue) {
          unlinkParent(value, obj);
          linkParent(newValue, obj);

          value = newValue;
          notify(obj);
        }
      },
      enumerable: true,
      configurable: true,
    });
  });

  return obj;
};

export function observable<
  T extends {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (...args: any[]): object;
  },
>(target: T) {
  return class extends target {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
      makeObservable(this);
    }
  };
}
