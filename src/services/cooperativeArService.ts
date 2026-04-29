/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import type { TradeReceivable, TradeReceivablePayment } from '../lib/types';

const COLLECTION_NAME = 'cooperative_trade_receivables';
const PAYMENTS_COLLECTION = 'cooperative_ar_payments';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore Error (${operationType}) on path ${path}:`, error);
  // We don't throw a new error here to avoid breaking the app, but we log it clearly.
}

export const listenToTradeReceivables = (callback: (data: TradeReceivable[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      dueDate: doc.data().dueDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as TradeReceivable[];
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME));
};

export const addTradeReceivable = async (data: Omit<TradeReceivable, 'id' | 'createdAt'>) => {
  try {
    return await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      date: Timestamp.fromDate(data.date),
      dueDate: Timestamp.fromDate(data.dueDate),
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    throw error;
  }
};

export const updateTradeReceivable = async (id: string, data: Partial<TradeReceivable>) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = { ...data };
    if (data.date) updateData.date = Timestamp.fromDate(data.date);
    if (data.dueDate) updateData.dueDate = Timestamp.fromDate(data.dueDate);
    return await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
};

export const deleteTradeReceivable = async (id: string) => {
  try {
    return await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    throw error;
  }
};

export const getTradeReceivable = async (id: string) => {
  return new Promise<TradeReceivable | null>((resolve, reject) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        resolve({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          dueDate: doc.data().dueDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
        } as TradeReceivable);
      } else {
        resolve(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
      reject(error);
    });
  });
};

export const listenToTradeReceivable = (id: string, callback: (data: TradeReceivable | null) => void) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      } as TradeReceivable);
    } else {
      callback(null);
    }
  }, (error) => handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`));
};

export const listenToArPayments = (arId: string, callback: (data: TradeReceivablePayment[]) => void) => {
  // Removed orderBy('paymentDate', 'desc') to avoid composite index requirement.
  // We will sort client-side in the component or here.
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('arId', '==', arId)
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as TradeReceivablePayment[];
    
    // Client-side sort
    data.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
    
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, PAYMENTS_COLLECTION));
};

export const addArPayment = async (arId: string, payments: any[]) => {
  try {
    const batch = writeBatch(db);
    
    payments.forEach(payment => {
      const docRef = doc(collection(db, PAYMENTS_COLLECTION));
      batch.set(docRef, {
        arId,
        amountPaid: payment.amountPaid,
        note: payment.note || '',
        transactionGroupId: payment.transactionGroupId || null,
        paymentDate: Timestamp.fromDate(payment.date || new Date()),
        createdAt: Timestamp.now(),
      });
    });
    
    return await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PAYMENTS_COLLECTION);
    throw error;
  }
};

export const deleteArPayment = async (id: string) => {
  try {
    return await deleteDoc(doc(db, PAYMENTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PAYMENTS_COLLECTION}/${id}`);
    throw error;
  }
};

export const listenToAllArPayments = (callback: (data: TradeReceivablePayment[]) => void) => {
  const q = query(collection(db, PAYMENTS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as TradeReceivablePayment[];
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, PAYMENTS_COLLECTION));
};
