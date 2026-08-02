import {
    collection,
    addDoc,
    setDoc,
    doc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Firestore,
  } from "firebase/firestore"
  import { db } from "./firebase"
  
  function getDb(): Firestore {
    if (!db) throw new Error("Firebase not configured")
    return db as Firestore
  }
import { ChatMessage, InsuranceApplication } from "./firestore-types"
  
  export const createApplication = async (data: Omit<InsuranceApplication, "id" | "createdAt" | "updatedAt">) => {
    const docRef = await addDoc(collection(getDb(), "pays"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  }
  
  export const updateApplication = async (id: string, data: Partial<InsuranceApplication>) => {
    const docRef = doc(getDb(), "pays", id)
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }
  
  export const getApplication = async (id: string) => {
    const docRef = doc(getDb(), "pays", id)
    const docSnap = await getDoc(docRef)
  
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as InsuranceApplication
    }
    return null
  }
  
  export const getAllApplications = async () => {
    const q = query(collection(getDb(), "pays"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InsuranceApplication)
  }
  
  export const getApplicationsByStatus = async (status: InsuranceApplication["status"]) => {
    const q = query(collection(getDb(), "pays"), where("status", "==", status), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as InsuranceApplication)
  }
  
  export const subscribeToApplications = (callback: (applications: InsuranceApplication[]) => void) => {
    const q = query(collection(getDb(), "pays"), orderBy("createdAt", "desc"))
    return onSnapshot(q, (snapshot) => {
      const applications = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as InsuranceApplication,
      )
      callback(applications)
    })
  }
  
  export const sendMessage = async (data: Omit<ChatMessage, "id" | "timestamp">) => {
    const docRef = await addDoc(collection(getDb(), "messages"), {
      ...data,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  }
  
  export const getMessages = async (applicationId: string) => {
    const q = query(collection(getDb(), "messages"), where("applicationId", "==", applicationId), orderBy("timestamp", "asc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ChatMessage)
  }
  
  export const subscribeToMessages = (applicationId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(collection(getDb(), "messages"), where("applicationId", "==", applicationId), orderBy("timestamp", "asc"))
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as ChatMessage,
      )
      callback(messages)
    })
  }
  
  export const markMessageAsRead = async (messageId: string) => {
    const docRef = doc(getDb(), "messages", messageId)
    await setDoc(docRef, { read: true }, { merge: true })
  }

  export const deleteApplication = async (id: string) => {
    const docRef = doc(getDb(), "pays", id)
    await deleteDoc(docRef)
  }

  export const deleteMultipleApplications = async (ids: string[]) => {
    const promises = ids.map(id => deleteApplication(id))
    await Promise.all(promises)
  }
  