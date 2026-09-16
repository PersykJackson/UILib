type Primitive = number | string | boolean | symbol | bigint | null | undefined;
type SafeValue = object | Primitive;
type Constructor<T extends object = object> = new (...args: SafeValue[]) => T;

const subscribersMap = new WeakMap<object, Set<() => void>>();
const rawToProxyMap = new WeakMap<object, object>();
const proxyToRawMap = new WeakMap<object, object>();
const childUnsubscribersMap = new WeakMap<object, Map<PropertyKey, () => void>>();
const observablePropertiesMap = new WeakMap<object, Set<PropertyKey>>();
const activeNotifications = new Set<object>();

const isObject = (val: SafeValue): val is object => {
  return val !== null && typeof val === 'object';
};

const getNormalizedTarget = (target: object): object => {
  return rawToProxyMap.get(target) ?? target;
};

export const subscribe = (target: object, callback: () => void): void => {
  const norm = getNormalizedTarget(target);
  let subs = subscribersMap.get(norm);
  if (!subs) {
    subs = new Set<() => void>();
    subscribersMap.set(norm, subs);
  }
  subs.add(callback);
};

const notify = (target: object): void => {
  const norm = getNormalizedTarget(target);
  if (activeNotifications.has(norm)) {
    return;
  }
  activeNotifications.add(norm);
  try {
    const subs = subscribersMap.get(norm);
    if (subs) {
      const callbacks = Array.from(subs);
      for (const cb of callbacks) {
        cb();
      }
    }
  } finally {
    activeNotifications.delete(norm);
  }
};

const unbindChildProperty = (parent: object, key: PropertyKey): void => {
  const propUnsubs = childUnsubscribersMap.get(parent);
  if (propUnsubs) {
    const cleanup = propUnsubs.get(key);
    if (cleanup) {
      cleanup();
      propUnsubs.delete(key);
    }
  }
};

const bindChildProperty = (parent: object, key: PropertyKey, childValue: object): void => {
  unbindChildProperty(parent, key);

  const normChild = getNormalizedTarget(childValue);

  let propUnsubs = childUnsubscribersMap.get(parent);
  if (!propUnsubs) {
    propUnsubs = new Map<PropertyKey, () => void>();
    childUnsubscribersMap.set(parent, propUnsubs);
  }

  const childCallback = (): void => {
    notify(parent);
  };

  subscribe(normChild, childCallback);

  propUnsubs.set(key, () => {
    const subs = subscribersMap.get(normChild);
    if (subs) {
      subs.delete(childCallback);
    }
  });
};

const getObservableKeys = (proto: object): Set<PropertyKey> => {
  const keys = new Set<PropertyKey>();
  let current: object | null = proto;
  while (current && current !== Object.prototype) {
    const props = observablePropertiesMap.get(current);
    if (props) {
      for (const key of props) {
        keys.add(key);
      }
    }
    current = Reflect.getPrototypeOf(current) as object | null;
  }
  return keys;
};

type Stage3FieldDecoratorContext = {
  name: PropertyKey;
  addInitializer?: (initializer: (this: object) => void) => void;
};

export const observable = (
  targetOrValue: object | undefined,
  contextOrKey: PropertyKey | Stage3FieldDecoratorContext,
): void => {
  if (typeof contextOrKey === 'object' && contextOrKey !== null) {
    const key = contextOrKey.name;

    if (contextOrKey.addInitializer) {
      contextOrKey.addInitializer(function (this: object) {
        const proto = Reflect.getPrototypeOf(this) as object | null;
        if (proto) {
          let props = observablePropertiesMap.get(proto);
          if (!props) {
            props = new Set<PropertyKey>();
            observablePropertiesMap.set(proto, props);
          }
          props.add(key);
        }
      });
    }
    return;
  }

  if (targetOrValue !== undefined) {
    let props = observablePropertiesMap.get(targetOrValue);
    if (!props) {
      props = new Set<PropertyKey>();
      observablePropertiesMap.set(targetOrValue, props);
    }
    props.add(contextOrKey);
  }
};

const createStoreProxy = <T extends object>(instance: T, proto: object): T => {
  if (proxyToRawMap.has(instance)) {
    return instance;
  }

  const existingProxy = rawToProxyMap.get(instance);
  if (existingProxy) {
    return existingProxy as T;
  }

  const observableKeys = getObservableKeys(proto);

  const proxy = new Proxy(instance, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver) as SafeValue;
    },
    set(target, prop, value, receiver) {
      const isObserved = observableKeys.has(prop);
      const oldValue = Reflect.get(target, prop, receiver) as SafeValue;

      if (oldValue === value) {
        return true;
      }

      const result = Reflect.set(target, prop, value, receiver);

      if (result && isObserved) {
        if (isObject(value)) {
          bindChildProperty(proxy, prop, value);
        } else {
          unbindChildProperty(proxy, prop);
        }
        notify(proxy);
      }

      return result;
    },
    deleteProperty(target, prop) {
      const isObserved = observableKeys.has(prop);
      const hadProp = Reflect.has(target, prop);
      const result = Reflect.deleteProperty(target, prop);

      if (result && hadProp && isObserved) {
        unbindChildProperty(proxy, prop);
        notify(proxy);
      }

      return result;
    },
  });

  rawToProxyMap.set(instance, proxy);
  proxyToRawMap.set(proxy, instance);

  for (const key of observableKeys) {
    const val = (instance as Record<PropertyKey, SafeValue>)[key];
    if (isObject(val)) {
      bindChildProperty(proxy, key, val);
    }
  }

  return proxy;
};

export const store = <T extends object, C extends Constructor<T>>(TargetClass: C): C => {
  return new Proxy(TargetClass, {
    construct(target, args: SafeValue[], newTarget) {
      const instance = Reflect.construct(target, args, newTarget) as T;
      return createStoreProxy(instance, TargetClass.prototype);
    },
  });
};
