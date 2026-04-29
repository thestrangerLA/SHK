/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, onSnapshot, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { DividendItem } from '../lib/types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

const COLLECTION_NAME = 'cooperative-dividend-structure';

export const listenToCooperativeDividendStructure = (callback: (structure: DividendItem[]) => void) => {
  return onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    const structure = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as DividendItem[];
    callback(structure);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  });
};

export const updateCooperativeDividendStructure = async (structure: DividendItem[]) => {
  const batch = writeBatch(db);
  
  // First, delete existing
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  // Then, add new
  structure.forEach(item => {
    const ref = doc(collection(db, COLLECTION_NAME));
    batch.set(ref, {
      name: item.name,
      percentage: item.percentage,
    });
  });

  try {
    return await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
  }
};
