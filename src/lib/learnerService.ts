import { doc, getDoc, setDoc, updateDoc, increment, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from './firebase';

export interface LearnerProfile {
  uid: string;
  email: string;
  nativeLanguage: string;
  targetLanguage: string;
  cefrLevel: string; // A1, A2, B1, B2, C1, C2
  correctionStyle: 'light' | 'balanced' | 'strict' | 'none';
  spokenMinutes: number;
  sessionCount: number;
  createdAt: number;
  lastActive: number;
}

export const getOrCreateLearnerProfile = async (uid: string, email: string): Promise<LearnerProfile> => {
  const docRef = doc(db, 'learners', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as LearnerProfile;
  } else {
    // Initialize new learner model
    const newProfile: LearnerProfile = {
      uid,
      email,
      nativeLanguage: 'Arabic',
      targetLanguage: 'German',
      cefrLevel: 'A1',
      correctionStyle: 'balanced',
      spokenMinutes: 0,
      sessionCount: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    await setDoc(docRef, newProfile);
    return newProfile;
  }
};

export const updateLearnerActivity = async (uid: string) => {
  const docRef = doc(db, 'learners', uid);
  await updateDoc(docRef, {
    lastActive: Date.now(),
    sessionCount: increment(1)
  });
};

export const updateCefrLevel = async (uid: string, newLevel: string) => {
  const docRef = doc(db, 'learners', uid);
  await updateDoc(docRef, {
    cefrLevel: newLevel
  });
};

export interface LearnerError {
  errorType: string;
  incorrectForm: string;
  correctForm: string;
  concept: string;
  timestamp: number;
}

export const trackLearnerError = async (uid: string, error: LearnerError) => {
  const errorRef = doc(db, `learners/${uid}/errors`, `${Date.now()}`);
  await setDoc(errorRef, error);
};

export interface VocabularyItem {
  word: string;
  translation: string;
  context: string;
  state: 'EXPOSED' | 'LEARNING' | 'MASTERED';
  timestamp: number;
}


export const trackVocabulary = async (uid: string, vocab: VocabularyItem) => {
  const wordId = vocab.word.toLowerCase().replace(/[^a-zäöüß]/g, '');
  if (!wordId) return;
  const vocabRef = doc(db, `learners/${uid}/vocabulary`, wordId);
  const docSnap = await getDoc(vocabRef);
  if (!docSnap.exists()) {
    await setDoc(vocabRef, vocab);
  }
};

export const getRecentErrors = async (uid: string): Promise<LearnerError[]> => {
  const q = query(
    collection(db, `learners/${uid}/errors`),
    orderBy('timestamp', 'desc'),
    limit(5)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as LearnerError);
};

export const getLearningVocabulary = async (uid: string): Promise<VocabularyItem[]> => {
  const q = query(
    collection(db, `learners/${uid}/vocabulary`),
    orderBy('timestamp', 'desc'),
    limit(5)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as VocabularyItem);
};

