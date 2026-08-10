class StoreManager<AppStore> {
  public store: AppStore | null = null;

  public register(store: AppStore) {
    this.store = store;
  }

  public getAppStore(): AppStore {
    if (!this.store) {
      throw new Error('Store is not registered.');
    }

    return this.store;
  }
}

export const registerStore = <AppStore>(store: AppStore) => {
  const manager = new StoreManager<AppStore>();
  manager.register(store);

  return manager.getAppStore.bind(manager);
};
