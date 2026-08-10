type Listener = () => void;

export const subscribersMap = new WeakMap<object, Set<Listener>>();

export const subscribe = (target: object, listener: Listener) => {
  if (!subscribersMap.has(target)) {
    subscribersMap.set(target, new Set());
  }
  subscribersMap.get(target)!.add(listener);

  return () => subscribersMap.get(target)?.delete(listener);
};
