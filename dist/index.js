
;// ./src/ui/createComponent.ts
const listeners = new Map();
const replaceId = (htmlString, id) => {
    const cleanHtml = htmlString.trim();
    if (/^<[a-z1-6]+\s+[^>]*\bid=/i.test(cleanHtml)) {
        return cleanHtml.replace(/\bid=['"].*?['"]/, `id="${id}"`);
    }
    return cleanHtml.replace(/^<([a-z1-6]+)/i, `<$1 id="${id}"`);
};
const renderComponent = ({ id, body, style, onClick, onChange }) => (props) => {
    const html = replaceId(body(props), id);
    const el = document.getElementById(id);
    const styleEl = document.getElementById('rootStyle');
    if (style && !styleEl.innerHTML.includes(style)) {
        styleEl.innerHTML += style;
    }
    if (el && el.outerHTML.trim() !== html.trim()) {
        el.outerHTML = html;
    }
    if (onClick || onChange) {
        if (listeners.has(id)) {
            const listener = listeners.get(id);
            const el = document.getElementById(id);
            if (listener.onClick) {
                el?.removeEventListener('click', listener.onClick);
            }
            if (listener.onChange) {
                el?.removeEventListener('input', listener.onChange);
            }
        }
        listeners.set(id, { id, onClick, onChange });
    }
    return html;
};
const createComponent = (componentProps) => {
    return renderComponent(componentProps);
};
const createPureComponent = (componentProps) => {
    return (props) => {
        const { id, style, onClick, onChange, ...sprops } = props;
        return renderComponent({
            id,
            body: componentProps.body,
            style: componentProps.style || style,
            onClick: onClick,
            onChange: onChange,
            ...sprops,
        })(sprops);
    };
};

;// ./src/ui/mount.ts
const mount = (id, component) => {
    const rootElement = document.getElementById(id);
    if (!rootElement) {
        throw new Error();
    }
    rootElement.innerHTML = component();
};

;// ./src/ui/renderRoot.ts


const renderRoot = (rootId, component) => {
    const rootComponent = document.getElementById(rootId);
    if (!rootComponent?.innerHTML) {
        mount(rootId, component);
    }
    else {
        component();
    }
    listeners.forEach(({ id, onClick, onChange }) => {
        const el = document.getElementById(id);
        if (onClick) {
            el?.removeEventListener('click', onClick);
            el?.addEventListener('click', onClick);
        }
        if (onChange) {
            el?.removeEventListener('input', onChange);
            el?.addEventListener('input', onChange);
        }
    });
};

;// ./src/store/bind.ts
function bind(target, context) {
    const methodName = context.name;
    context.addInitializer(function () {
        this[methodName] = target.bind(this);
    });
}

;// ./src/store/makeObservable.ts
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
const subscribe = (target, callback) => {
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
const observable = (targetOrValue, contextOrKey) => {
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
const store = (TargetClass) => {
    return new Proxy(TargetClass, {
        construct(target, args, newTarget) {
            const instance = Reflect.construct(target, args, newTarget);
            return createStoreProxy(instance, TargetClass.prototype);
        },
    });
};

;// ./src/store/registerStore.ts
class StoreManager {
    store = null;
    register(store) {
        this.store = store;
    }
    getAppStore() {
        if (!this.store) {
            throw new Error('Store is not registered.');
        }
        return this.store;
    }
}
const registerStore = (store) => {
    const manager = new StoreManager();
    manager.register(store);
    return manager.getAppStore.bind(manager);
};

;// ./src/store/PrivateValue.ts
var __runInitializers = (undefined && undefined.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (undefined && undefined.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};

let PrivateValue = (() => {
    let _instanceExtraInitializers = [];
    let _getValue_decorators;
    return class PrivateValue {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getValue_decorators = [bind];
            __esDecorate(this, null, _getValue_decorators, { kind: "method", name: "getValue", static: false, private: false, access: { has: obj => "getValue" in obj, get: obj => obj.getValue }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        value = __runInitializers(this, _instanceExtraInitializers);
        constructor(value) {
            this.value = value;
        }
        setValue(value) {
            this.value = value;
        }
        getValue() {
            return this.value;
        }
    };
})();


;// ./src/store/index.ts






;// ./src/ui/index.ts






;// ./index.ts



export { PrivateValue, bind, createComponent, createPureComponent, mount, observable, registerStore, renderRoot, store, subscribe };
