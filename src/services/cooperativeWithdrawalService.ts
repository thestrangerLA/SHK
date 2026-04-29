/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { CooperativeWithdrawal } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { createMultiLegTransaction } from './cooperativeAccountingService';

const COLLECTION_NAME = 'cooperativeWithdrawals';

export const listenToCooperativeWithdrawalsForMember = (memberId: string, callback: (withdrawals: CooperativeWithdrawal[]) => void) => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('memberId', '==', memberId)
  );
  return onSnapshot(q, (snapshot) => {
    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CooperativeWithdrawal[];
    
    // Sort in memory to avoid requiring a composite index
    const sortedWithdrawals = withdrawals.sort((a, b) => b.date.getTime() - a.date.getTime());
    callback(sortedWithdrawals);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const listenToAllCooperativeWithdrawals = (callback: (withdrawals: CooperativeWithdrawal[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CooperativeWithdrawal[];
    callback(withdrawals);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const addCooperativeWithdrawal = async (withdrawal: Omit<CooperativeWithdrawal, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...withdrawal,
      createdAt: new Date(),
    });

    // Automatically create accounting transaction
    // 1. Credit Cash (101) - Decrease cash
    // 2. Credit Deposits Payable (201) - Decrease deposit balance (Debit-normal in this system)
    // 3. Debit Share Capital (301) - Offset both
    const amount = { kip: withdrawal.kip || 0, thb: withdrawal.thb || 0, usd: withdrawal.usd || 0, cny: withdrawal.cny || 0 };
    await createMultiLegTransaction(
      [
        { accountId: 'cash', type: 'credit', amount },
        { accountId: 'deposits_payable', type: 'credit', amount },
        { accountId: 'capital', type: 'debit', amount: { 
          kip: amount.kip * 2, 
          thb: amount.thb * 2, 
          usd: amount.usd * 2, 
          cny: amount.cny * 2 
        } }
      ],
      `ຖອນເງິນສະມາຊິກ: ${withdrawal.memberName}`,
      withdrawal.date
    );

    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const deleteCooperativeWithdrawal = async (id: string) => {
  try {
    return await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
