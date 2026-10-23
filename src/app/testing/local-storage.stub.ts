import { vi } from 'vitest'

/**
 * Gives the window an empty in-memory local storage until `vi.restoreAllMocks()`. Tests use this
 * rather than the global `localStorage`, which Node 25+ defines itself, hiding jsdom's, and leaves
 * undefined unless Node is started with a storage file.
 */
export function stubLocalStorage(): Storage {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key)
    },
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }

  vi.spyOn(document.defaultView!, 'localStorage', 'get').mockReturnValue(storage)
  return storage
}
