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
export const registerStore = (store) => {
    const manager = new StoreManager();
    manager.register(store);
    return manager.getAppStore.bind(manager);
};
