import { clsx, type ClassValue } from "clsx"
import { onDisconnect, onValue, ref, serverTimestamp, set } from "firebase/database";
import { twMerge } from "tailwind-merge"
import { database, db } from "./firebase";
import { doc, setDoc, Firestore } from "firebase/firestore";

function getDb(): Firestore {
  if (!db) throw new Error("Firebase not configured")
  return db as Firestore
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const onlyNumbers = (value: string) => {
  return value.replace(/[^\d٠-٩]/g, '');
};



export const setupOnlineStatus = (userId: string) => {
  if (!userId || !db || !database) return;

  const userStatusRef = ref(database, `/status/${userId}`);

  const userDocRef = doc(getDb(), "pays", userId);

  onDisconnect(userStatusRef)
    .set({
      state: "offline",
      lastChanged: serverTimestamp(),
    })
    .then(() => {
      set(userStatusRef, {
        state: "online",
        lastChanged: serverTimestamp(),
      });

      setDoc(userDocRef, {
        online: true,
        lastSeen: serverTimestamp(),
      }).catch((error) =>
        console.error("Error updating Firestore document:", error)
      );
    })
    .catch((error) => console.error("Error setting onDisconnect:", error));

  onValue(userStatusRef, (snapshot) => {
    const status = snapshot.val();
    if (status?.state === "offline") {
      setDoc(userDocRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch((error) =>
        console.error("Error updating Firestore document:", error)
      );
    }
  });
};

export const setUserOffline = async (userId: string) => {
  if (!userId || !db || !database) return;

  try {
    await setDoc(doc(getDb(), "pays", userId), {
      online: false,
      lastSeen: serverTimestamp(),
    }, { merge: true });

    await set(ref(database, `/status/${userId}`), {
      state: "offline",
      lastChanged: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error setting user offline:", error);
  }
};