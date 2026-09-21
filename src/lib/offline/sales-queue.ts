import type { CartLine, PaymentMethod } from "@/types/sales";

const DATABASE_NAME = "samagestion-offline";
const STORE_NAME = "pending-sales";

export type PendingOfflineSale = {
  id: string;
  businessId: string;
  userId: string;
  createdAt: string;
  items: CartLine[];
  discount: number;
  customerId: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  checkoutMode: "" | "queue" | "direct";
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export function enqueueOfflineSale(sale: Omit<PendingOfflineSale, "id" | "createdAt">) {
  const record: PendingOfflineSale = {
    ...sale,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  return withStore("readwrite", (store) => store.add(record));
}

export async function listOfflineSales(businessId: string, userId: string) {
  const records = await withStore("readonly", (store) => store.getAll());
  return (records as PendingOfflineSale[])
    .filter((record) => record.businessId === businessId && record.userId === userId)
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

export function removeOfflineSale(id: string) {
  return withStore("readwrite", (store) => store.delete(id));
}
