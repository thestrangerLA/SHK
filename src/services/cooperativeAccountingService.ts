/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Transaction, CurrencyValues } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

const COLLECTION_NAME = 'cooperative-transactions';

export const listenToCooperativeTransactions = (callback: (transactions: Transaction[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Transaction[];
    callback(transactions);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const createTransaction = async (debitAccountId: string, creditAccountId: string, amount: CurrencyValues, description: string, date: Date = new Date()) => {
  const batch = writeBatch(db);
  const groupId = uuidv4();

  const debitRef = doc(collection(db, COLLECTION_NAME));
  batch.set(debitRef, {
    transactionGroupId: groupId,
    accountId: debitAccountId,
    date,
    amount,
    type: 'debit',
    description,
    createdAt: new Date(),
  });

  const creditRef = doc(collection(db, COLLECTION_NAME));
  batch.set(creditRef, {
    transactionGroupId: groupId,
    accountId: creditAccountId,
    date,
    amount,
    type: 'credit',
    description,
    createdAt: new Date(),
  });

  try {
    return await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
};

export const deleteTransactionGroup = async (groupId: string) => {
  const q = query(collection(db, COLLECTION_NAME), where('transactionGroupId', '==', groupId));
  try {
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    return await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
  }
};

export const getAccountBalances = (transactions: Transaction[]): Record<string, CurrencyValues> => {
  const balances: Record<string, CurrencyValues> = {};

  transactions.forEach(tx => {
    if (!balances[tx.accountId]) {
      balances[tx.accountId] = { kip: 0, thb: 0, usd: 0, cny: 0 };
    }

    const multiplier = tx.type === 'debit' ? 1 : -1;
    balances[tx.accountId].kip += (tx.amount?.kip || 0) * multiplier;
    balances[tx.accountId].thb += (tx.amount?.thb || 0) * multiplier;
    balances[tx.accountId].usd += (tx.amount?.usd || 0) * multiplier;
    balances[tx.accountId].cny += (tx.amount?.cny || 0) * multiplier;
  });

  return balances;
};
