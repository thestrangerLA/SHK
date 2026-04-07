/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Account } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { defaultAccounts } from './cooperativeChartOfAccounts';

const COLLECTION_NAME = 'cooperativeAccounts';

export const listenToCooperativeAccounts = (callback: (accounts: Account[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Account[];
    
    // If no accounts exist, initialize with defaults
    if (accounts.length === 0) {
      initializeDefaultAccounts();
    }
    
    callback(accounts);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const initializeDefaultAccounts = async () => {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    if (snapshot.empty) {
      const batch = writeBatch(db);
      defaultAccounts.forEach(account => {
        const { id, ...data } = account;
        // Use the id as the document ID if possible, or let Firestore generate one
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.set(docRef, data);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
};

export const addCooperativeAccount = async (account: Omit<Account, 'id'>) => {
  try {
    return await addDoc(collection(db, COLLECTION_NAME), account);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const seedInitialSystemData = async () => {
  try {
    // Check if we already have members
    const membersSnapshot = await getDocs(collection(db, 'cooperativeMembers'));
    if (membersSnapshot.empty) {
      // Create a default member
      const memberRef = await addDoc(collection(db, 'cooperativeMembers'), {
        memberId: 'M001',
        name: 'ສະມາຊິກທົດລອງ (Seed Member)',
        joinDate: new Date(),
        deposits: { kip: 436727510, thb: 6100, usd: 0, cny: 0 },
        createdAt: new Date(),
      });

      // Add the initial deposit to match the image
      await addDoc(collection(db, 'cooperativeDeposits'), {
        memberId: memberRef.id,
        memberName: 'ສະມາຊິກທົດລອງ (Seed Member)',
        date: new Date(),
        kip: 436727510,
        thb: 6100,
        usd: 0,
        cny: 0,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error seeding system data:', error);
  }
};
