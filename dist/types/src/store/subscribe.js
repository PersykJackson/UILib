export const subscribersMap = new WeakMap();
export const subscribe = (target, listener) => {
    if (!subscribersMap.has(target)) {
        subscribersMap.set(target, new Set());
    }
    subscribersMap.get(target).add(listener);
    return () => subscribersMap.get(target)?.delete(listener);
};
