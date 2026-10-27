/**
 * Jest mock for AsyncStorage. Provides an in-memory implementation so storage
 * tests can run without the native module.
 */
const store = new Map<string, string>();

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => store.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    store.delete(key);
  }),
  clear: jest.fn(async () => {
    store.clear();
  }),
  getAllKeys: jest.fn(async () => Array.from(store.keys())),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => store.delete(k));
  }),
};

export default AsyncStorage;
