const subscribersMap = new WeakMap();
const rawToProxyMap = new WeakMap();
const proxyToRawMap = new WeakMap();
const childUnsubscribersMap = new WeakMap();
const observablePropertiesMap = new WeakMap();
const activeNotifications = new Set();
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
const getNormalizedTarget = (target) => {
    return rawToProxyMap.get(target) ?? target;
};
export const subscribe = (target, callback) => {
    const norm = getNormalizedTarget(target);
    let subs = subscribersMap.get(norm);
    if (!subs) {
        subs = new Set();
        subscribersMap.set(norm, subs);
    }
    subs.add(callback);
};
const notify = (target) => {
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
    }
    finally {
        activeNotifications.delete(norm);
    }
};
const unbindChildProperty = (parent, key) => {
    const propUnsubs = childUnsubscribersMap.get(parent);
    if (propUnsubs) {
        const cleanup = propUnsubs.get(key);
        if (cleanup) {
            cleanup();
            propUnsubs.delete(key);
        }
    }
};
const bindChildProperty = (parent, key, childValue) => {
    unbindChildProperty(parent, key);
    const normChild = getNormalizedTarget(childValue);
    let propUnsubs = childUnsubscribersMap.get(parent);
    if (!propUnsubs) {
        propUnsubs = new Map();
        childUnsubscribersMap.set(parent, propUnsubs);
    }
    const childCallback = () => {
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
const getObservableKeys = (proto) => {
    const keys = new Set();
    let current = proto;
    while (current && current !== Object.prototype) {
        const props = observablePropertiesMap.get(current);
        if (props) {
            for (const key of props) {
                keys.add(key);
            }
        }
        current = Reflect.getPrototypeOf(current);
    }
    return keys;
};
export const observable = (targetOrValue, contextOrKey) => {
    if (typeof contextOrKey === 'object' && contextOrKey !== null) {
        const key = contextOrKey.name;
        if (contextOrKey.addInitializer) {
            contextOrKey.addInitializer(function () {
                const proto = Reflect.getPrototypeOf(this);
                if (proto) {
                    let props = observablePropertiesMap.get(proto);
                    if (!props) {
                        props = new Set();
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
            props = new Set();
            observablePropertiesMap.set(targetOrValue, props);
        }
        props.add(contextOrKey);
    }
};
const createStoreProxy = (instance, proto) => {
    if (proxyToRawMap.has(instance)) {
        return instance;
    }
    const existingProxy = rawToProxyMap.get(instance);
    if (existingProxy) {
        return existingProxy;
    }
    const observableKeys = getObservableKeys(proto);
    const proxy = new Proxy(instance, {
        get(target, prop, receiver) {
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
            const isObserved = observableKeys.has(prop);
            const oldValue = Reflect.get(target, prop, receiver);
            if (oldValue === value) {
                return true;
            }
            const result = Reflect.set(target, prop, value, receiver);
            if (result && isObserved) {
                if (isObject(value)) {
                    bindChildProperty(proxy, prop, value);
                }
                else {
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
        const val = instance[key];
        if (isObject(val)) {
            bindChildProperty(proxy, key, val);
        }
    }
    return proxy;
};
export const store = (TargetClass) => {
    return new Proxy(TargetClass, {
        construct(target, args, newTarget) {
            const instance = Reflect.construct(target, args, newTarget);
            return createStoreProxy(instance, TargetClass.prototype);
        },
    });
};
