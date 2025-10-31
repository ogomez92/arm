import type { Report } from '../types';

const DB_NAME = 'a11y-reporter-db';
const DB_VERSION = 1;
const STORE_NAME = 'reports';
const CURRENT_REPORT_KEY = 'current-report';
const SORT_PREFERENCE_KEY = 'sort-preference';

export type SortBy = 'page' | 'criteria' | 'priority';

export class IndexedDBStorage {
	private static dbPromise: Promise<IDBDatabase> | null = null;

	/**
	 * Initialize the IndexedDB database
	 */
	private static initDB(): Promise<IDBDatabase> {
		if (this.dbPromise) {
			return this.dbPromise;
		}

		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => {
				console.error('IndexedDB open error:', request.error);
				this.dbPromise = null; // Clear promise on error so we can retry
				reject(new Error('Failed to open IndexedDB: ' + request.error?.message));
			};

			request.onsuccess = () => {
				console.log('IndexedDB opened successfully');
				resolve(request.result);
			};

			request.onupgradeneeded = (event) => {
				console.log('IndexedDB upgrade needed, creating object store');
				const db = (event.target as IDBOpenDBRequest).result;

				// Create object store if it doesn't exist
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME);
					console.log('Object store created:', STORE_NAME);
				}
			};
		});

		return this.dbPromise;
	}

	/**
	 * Save the current report to IndexedDB
	 */
	static async saveCurrentReport(report: Report): Promise<void> {
		try {
			const db = await this.initDB();
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);

			// Serialize and deserialize to create a plain object (removes Svelte proxies/reactivity)
			const plainReport = JSON.parse(JSON.stringify(report)) as Report;

			// Wait for both the request AND the transaction to complete
			await new Promise<void>((resolve, reject) => {
				const request = store.put(plainReport, CURRENT_REPORT_KEY);

				transaction.oncomplete = () => {
					console.log('Report saved successfully to IndexedDB (transaction complete)');
					resolve();
				};

				transaction.onerror = () => {
					console.error('Transaction error:', transaction.error);
					reject(new Error('Transaction failed: ' + transaction.error?.message));
				};

				request.onerror = () => {
					console.error('Error saving report:', request.error);
					reject(new Error('Failed to save report: ' + request.error?.message));
				};
			});
		} catch (error) {
			console.error('Error saving report to IndexedDB:', error);
			throw error;
		}
	}

	/**
	 * Load the current report from IndexedDB
	 */
	static async loadCurrentReport(): Promise<Report | null> {
		try {
			const db = await this.initDB();
			const transaction = db.transaction([STORE_NAME], 'readonly');
			const store = transaction.objectStore(STORE_NAME);

			return new Promise<Report | null>((resolve, reject) => {
				const request = store.get(CURRENT_REPORT_KEY);
				request.onsuccess = () => {
					const result = request.result || null;
					console.log('Report loaded from IndexedDB:', result ? 'Found' : 'Not found');
					resolve(result);
				};
				request.onerror = () => {
					console.error('Error loading report:', request.error);
					reject(new Error('Failed to load report: ' + request.error?.message));
				};
			});
		} catch (error) {
			console.error('Error loading report from IndexedDB:', error);
			return null;
		}
	}

	/**
	 * Delete the current report from IndexedDB
	 */
	static async deleteCurrentReport(): Promise<void> {
		try {
			const db = await this.initDB();
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);

			await new Promise<void>((resolve, reject) => {
				const request = store.delete(CURRENT_REPORT_KEY);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(new Error('Failed to delete report'));
			});
		} catch (error) {
			console.error('Error deleting report from IndexedDB:', error);
			throw error;
		}
	}

	/**
	 * Save sort preference to IndexedDB
	 */
	static async saveSortPreference(sortBy: SortBy): Promise<void> {
		try {
			const db = await this.initDB();
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);

			await new Promise<void>((resolve, reject) => {
				store.put(sortBy, SORT_PREFERENCE_KEY);

				transaction.oncomplete = () => {
					console.log('Sort preference saved successfully');
					resolve();
				};

				transaction.onerror = () => {
					console.error('Transaction error:', transaction.error);
					reject(new Error('Failed to save sort preference: ' + transaction.error?.message));
				};
			});
		} catch (error) {
			console.error('Error saving sort preference to IndexedDB:', error);
			throw error;
		}
	}

	/**
	 * Load sort preference from IndexedDB
	 */
	static async loadSortPreference(): Promise<SortBy | null> {
		try {
			const db = await this.initDB();
			const transaction = db.transaction([STORE_NAME], 'readonly');
			const store = transaction.objectStore(STORE_NAME);

			return new Promise<SortBy | null>((resolve, reject) => {
				const request = store.get(SORT_PREFERENCE_KEY);
				request.onsuccess = () => {
					const result = request.result;
					if (result && ['page', 'criteria', 'priority'].includes(result)) {
						resolve(result as SortBy);
					} else {
						resolve(null);
					}
				};
				request.onerror = () => reject(new Error('Failed to load sort preference'));
			});
		} catch (error) {
			console.error('Error loading sort preference from IndexedDB:', error);
			return null;
		}
	}

	/**
	 * Migrate data from localStorage to IndexedDB
	 * This should be called once on app initialization
	 */
	static async migrateFromLocalStorage(): Promise<void> {
		const STORAGE_KEY = 'a11y-reporter-current-report';
		const SORT_STORAGE_KEY = 'a11y-reporter-sort-preference';

		try {
			// Check if there's data in localStorage
			const savedReport = localStorage.getItem(STORAGE_KEY);
			const savedSort = localStorage.getItem(SORT_STORAGE_KEY);

			if (savedReport) {
				console.log('Migrating report from localStorage to IndexedDB...');
				const report = JSON.parse(savedReport) as Report;
				await this.saveCurrentReport(report);

				// Remove from localStorage after successful migration
				localStorage.removeItem(STORAGE_KEY);
				console.log('Report migration completed');
			}

			if (savedSort && ['page', 'criteria', 'priority'].includes(savedSort)) {
				console.log('Migrating sort preference from localStorage to IndexedDB...');
				await this.saveSortPreference(savedSort as SortBy);

				// Remove from localStorage after successful migration
				localStorage.removeItem(SORT_STORAGE_KEY);
				console.log('Sort preference migration completed');
			}
		} catch (error) {
			console.error('Error during migration from localStorage:', error);
			// Don't throw error - we can continue without migration
		}
	}
}
