/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { CooperativeDeposit } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { createTransaction } from './cooperativeAccountingService';

const COLLECTION_NAME = 'cooperativeDeposits';

export const listenToCooperativeDeposits = (callback: (deposits: CooperativeDeposit[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const deposits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CooperativeDeposit[];
    callback(deposits);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const addCooperativeDeposit = async (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...deposit,
      createdAt: new Date(),
    });

    // Automatically create accounting transaction
    // Debit Cash (101), Credit Share Capital (301)
    await createTransaction(
      'cash', 
      'capital', 
      { kip: deposit.kip || 0, thb: deposit.thb || 0, usd: deposit.usd || 0, cny: deposit.cny || 0 },
      `ເງິນຝາກສະມາຊິກ: ${deposit.memberName}`,
      deposit.date
    );

    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const deleteCooperativeDeposit = async (id: string) => {
  try {
    return await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
