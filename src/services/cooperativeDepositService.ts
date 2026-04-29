/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { CooperativeDeposit } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { createMultiLegTransaction } from './cooperativeAccountingService';

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
    // 1. Debit Cash (101) - Increase cash
    // 2. Debit Deposits Payable (201) - Increase deposit balance (Debit-normal in this system)
    // 3. Credit Share Capital (301) - Offset both
    const amount = { kip: deposit.kip || 0, thb: deposit.thb || 0, usd: deposit.usd || 0, cny: deposit.cny || 0 };
    await createMultiLegTransaction(
      [
        { accountId: 'cash', type: 'debit', amount },
        { accountId: 'deposits_payable', type: 'debit', amount },
        { accountId: 'capital', type: 'credit', amount: { 
          kip: amount.kip * 2, 
          thb: amount.thb * 2, 
          usd: amount.usd * 2, 
          cny: amount.cny * 2 
        } }
      ],
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
