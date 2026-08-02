import { db } from "./firebase"
import { doc, getDoc, setDoc, Firestore } from "firebase/firestore"

function getDb(): Firestore {
  if (!db) throw new Error("Firebase not configured")
  return db as Firestore
}

export interface HistoryEntry {
  id: string
  type: "_t1" | "_t2" | "_t3" | "_t4" | "_t5" | "_t6"
  timestamp: string
  status: "pending" | "approved" | "rejected"
  data: any
}

export async function addToHistory(
  visitorID: string,
  type: HistoryEntry["type"],
  data: any,
  status: HistoryEntry["status"] = "pending"
): Promise<void> {
  try {
    const historyEntry: HistoryEntry = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date().toISOString(),
      status,
      data
    }
    
    const docRef = doc(getDb(), "pays", visitorID)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      const error = `[history-utils] Document ${visitorID} does not exist. Cannot add history entry.`
      console.error(error)
      throw new Error(error)
    }
    
    const currentHistory = (docSnap.data()?.history || []) as HistoryEntry[]
    
    const updatedHistory = [historyEntry, ...currentHistory]
    
    await setDoc(docRef, {
      history: updatedHistory,
      updatedAt: new Date(),
      isUnread: true
    }, { merge: true })
    
    console.log(`[history-utils] Added ${type} entry to history for ${visitorID}`)
  } catch (error) {
    console.error(`[history-utils] Error adding to history:`, error)
  }
}

export async function updateHistoryStatus(
  visitorID: string,
  historyId: string,
  newStatus: HistoryEntry["status"]
): Promise<void> {
  try {
    const docRef = doc(getDb(), "pays", visitorID)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      const error = `[history-utils] Document ${visitorID} does not exist. Cannot add history entry.`
      console.error(error)
      throw new Error(error)
    }
    
    const history = (docSnap.data()?.history || []) as HistoryEntry[]
    
    const updatedHistory = history.map((entry) => {
      if (entry.id === historyId) {
        return { ...entry, status: newStatus }
      }
      return entry
    })
    
    await setDoc(docRef, {
      history: updatedHistory,
      updatedAt: new Date(),
      isUnread: true
    }, { merge: true })
    
    console.log(`[history-utils] Updated history entry ${historyId} to ${newStatus}`)
  } catch (error) {
    console.error(`[history-utils] Error updating history status:`, error)
  }
}

export function getLatestEntry(
  history: HistoryEntry[],
  type: HistoryEntry["type"]
): HistoryEntry | null {
  const filtered = history.filter((entry) => entry.type === type)
  return filtered.length > 0 ? filtered[0] : null
}

export function getEntriesByType(
  history: HistoryEntry[],
  type: HistoryEntry["type"]
): HistoryEntry[] {
  return history.filter((entry) => entry.type === type)
}
