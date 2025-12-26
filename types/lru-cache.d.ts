declare module 'lru-cache' {
	export class LRUCache<K = any, V = any> {
		constructor(opts?: any)
		get(key: K): V | undefined
		set(key: K, value: V): void
		has(key: K): boolean
		delete(key: K): void
	}
	export default LRUCache
}
