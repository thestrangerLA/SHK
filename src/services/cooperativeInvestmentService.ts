/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { CooperativeInvestment } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

const COLLECTION_NAME = 'cooperativeInvestments';

export const listenToCooperativeInvestments = (callback: (investments: CooperativeInvestment[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const investments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as CooperativeInvestment[];
    callback(investments);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};
