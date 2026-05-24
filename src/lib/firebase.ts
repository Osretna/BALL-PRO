/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocFromServer,
  Firestore
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

// Check if actual configuration has been loaded or if the app runs in Local Sandbox.
export const isFirebaseConfigured =
  !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "MISSING_API_KEY");

console.log("Firebase config check debug:", {
  isFirebaseConfigured,
  hasApiKey: !!firebaseConfig.apiKey,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : null,
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId
});

let app;
let db: Firestore | null = null;
let auth: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured) {
  try {
    console.log("Attempting to initialize Firebase...");
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase initialized successfully. auth status:", !!auth);

    // Verify database connection asynchronously
    getDocFromServer(doc(db, "test", "connection")).catch((err) => {
      if (err instanceof Error && err.message.includes("the client is offline")) {
        console.warn("Client offline. Retrying...");
      }
    });
  } catch (error) {
    console.error("Firebase Initialization Failed: ", error);
  }
} else {
  console.warn("Firebase is NOT configured status. Standard offline mode active.");
}

export { db, auth, googleProvider };

/**
 * Mandatory Error Handler adhering strictly to Section 3 of the Firebase integration guidlines.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid || null,
      email: currentAuth?.currentUser?.email || null,
      emailVerified: currentAuth?.currentUser?.emailVerified || null,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sign in using Popup mechanism
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    throw new Error("Firebase Auth is not configured.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Auth failed: ", error);
    throw error;
  }
}

/**
 * Sign out current session
 */
export async function logOut(): Promise<void> {
  if (!isFirebaseConfigured || !auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed: ", error);
    throw error;
  }
}

/**
 * Core User Profile synchronization
 */
export async function fetchOrCreateProfile(user: User): Promise<any> {
  if (!db) return null;
  const pathStr = `profiles/${user.uid}`;
  try {
    const docRef = doc(db, "profiles", user.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data();
    } else {
      const initialProfile = {
        userId: user.uid,
        displayName: user.displayName || "لاعب بلياردو",
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        xp: 0,
        level: 1,
        coins: 500,
        playedGames: 0,
        wonGames: 0,
        equippedCue: "classic_wood",
        equippedTheme: "billiard_green",
        unlockedCues: ["classic_wood"],
        unlockedThemes: ["billiard_green"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, initialProfile);
      return initialProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathStr);
  }
}

/**
 * Update Profile data
 */
export async function updateProfile(userId: string, updates: Partial<any>): Promise<void> {
  if (!db) return;
  const pathStr = `profiles/${userId}`;
  try {
    const docRef = doc(db, "profiles", userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathStr);
  }
}
