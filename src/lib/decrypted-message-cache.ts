/**
 * Persistent cache for decrypted message plaintext.
 *
 * Double Ratchet sessions are stateful — once a message is decrypted the chain
 * key advances and the old message key is consumed. If the user refreshes the
 * page, the session has already moved past those keys, so re-decryption will
 * fail. This cache stores the plaintext in IndexedDB so messages only need to
 * be decrypted once.
 */

const DB_NAME = 'sentinel-decrypted-messages';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(new Error('Failed to open decrypted messages database'));

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'messageId' });
            }
        };
    });
}

export interface CachedDecryptedMessage {
    messageId: string;
    plaintext: string;
    cachedAt: number;
}

/** Store a decrypted plaintext for a message. */
export async function cacheDecryptedMessage(messageId: string, plaintext: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: CachedDecryptedMessage = { messageId, plaintext, cachedAt: Date.now() };
        const request = store.put(record);

        request.onerror = () => reject(new Error('Failed to cache decrypted message'));
        request.onsuccess = () => resolve();
    });
}

/** Retrieve cached plaintext for a single message. */
export async function getCachedDecryptedMessage(messageId: string): Promise<string | null> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(messageId);

        request.onerror = () => reject(new Error('Failed to get cached decrypted message'));
        request.onsuccess = () => {
            const record = request.result as CachedDecryptedMessage | undefined;
            resolve(record?.plaintext ?? null);
        };
    });
}

/** Retrieve cached plaintext for multiple messages. Returns a Map of messageId -> plaintext. */
export async function getCachedDecryptedMessages(messageIds: string[]): Promise<Map<string, string>> {
    if (messageIds.length === 0) return new Map();

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const result = new Map<string, string>();
        let completed = 0;

        for (const id of messageIds) {
            const request = store.get(id);
            request.onerror = () => reject(new Error('Failed to batch get cached messages'));
            request.onsuccess = () => {
                const record = request.result as CachedDecryptedMessage | undefined;
                if (record) {
                    result.set(record.messageId, record.plaintext);
                }
                completed++;
                if (completed === messageIds.length) {
                    resolve(result);
                }
            };
        }
    });
}

/** Remove cached plaintext for a message (e.g. on hard delete). */
export async function removeCachedDecryptedMessage(messageId: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(messageId);

        request.onerror = () => reject(new Error('Failed to remove cached message'));
        request.onsuccess = () => resolve();
    });
}
