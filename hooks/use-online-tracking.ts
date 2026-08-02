"use client"

import { useEffect } from "react"
import { doc, setDoc, serverTimestamp, Firestore } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { usePathname } from "next/navigation"

// Function to generate a unique visitor ID
function generateVisitorID(): string {
  return `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Function to detect device info
function getDeviceInfo() {
  const ua = navigator.userAgent
  let deviceType = "Desktop"
  let browser = "Unknown"
  let os = "Unknown"

  // Detect device type
  if (/mobile/i.test(ua)) deviceType = "Mobile"
  else if (/tablet|ipad/i.test(ua)) deviceType = "Tablet"

  // Detect browser
  if (ua.indexOf("Firefox") > -1) browser = "Firefox"
  else if (ua.indexOf("Chrome") > -1) browser = "Chrome"
  else if (ua.indexOf("Safari") > -1) browser = "Safari"
  else if (ua.indexOf("Edge") > -1) browser = "Edge"

  // Detect OS
  if (ua.indexOf("Win") > -1) os = "Windows"
  else if (ua.indexOf("Mac") > -1) os = "MacOS"
  else if (ua.indexOf("Linux") > -1) os = "Linux"
  else if (ua.indexOf("Android") > -1) os = "Android"
  else if (ua.indexOf("iOS") > -1) os = "iOS"

  return {
    deviceType,
    browser,
    os,
    screenResolution: `${window.screen.width}x${window.screen.height}`
  }
}

export function useOnlineTracking() {
  const pathname = usePathname()

  useEffect(() => {
    if (!db) {
      console.warn("[OnlineTracking] Firebase not configured - tracking disabled")
      return
    }
    
    let visitorID = localStorage.getItem("visitor")
    
    // Create visitor if doesn't exist
    const initializeVisitor = async () => {
      if (!visitorID) {
        visitorID = generateVisitorID()
        localStorage.setItem("visitor", visitorID)
        
        // Create new visitor document
        const deviceInfo = getDeviceInfo()
        try {
          await setDoc(doc(db as Firestore, "pays", visitorID), {
            id: visitorID,
            isOnline: true,
            sessionStartAt: new Date().toISOString(),
            lastSeen: serverTimestamp(),
            currentPage: pathname,
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            screenResolution: deviceInfo.screenResolution,
            status: "draft",
            paymentStatus: "pending",
            currentStep: "home",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          console.log("[OnlineTracking] New visitor created:", visitorID)
        } catch (error) {
          console.error("[OnlineTracking] Error creating visitor:", error)
        }
      } else {
        // Update existing visitor
        try {
          await setDoc(doc(db as Firestore, "pays", visitorID), {
            isOnline: true,
            lastSeen: serverTimestamp(),
            currentPage: pathname,
            updatedAt: serverTimestamp()
          }, { merge: true })
          console.log("[OnlineTracking] Visitor updated:", visitorID)
        } catch (error) {
          console.error("[OnlineTracking] Error updating visitor:", error)
        }
      }
    }

    // Set offline
    const setOffline = async () => {
      if (!visitorID) return
      try {
        await setDoc(doc(db as Firestore, "pays", visitorID), {
          isOnline: false,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true })
      } catch (error) {
        console.error("[OnlineTracking] Error setting offline:", error)
      }
    }

    // Update last active time
    const updateLastActive = async () => {
      if (!visitorID) return
      try {
        await setDoc(doc(db as Firestore, "pays", visitorID), {
          lastSeen: serverTimestamp(),
          currentPage: pathname,
          updatedAt: serverTimestamp()
        }, { merge: true })
      } catch (error) {
        console.error("[OnlineTracking] Error updating last active:", error)
      }
    }

    // Initialize visitor
    initializeVisitor()

    // Update last active every 15 seconds for real-time accuracy
    const interval = setInterval(updateLastActive, 15000)

    // Handle page unload
    const handleBeforeUnload = () => {
      setOffline()
    }

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline()
      } else {
        setDoc(doc(db as Firestore, "pays", visitorID!), {
          isOnline: true,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(console.error)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Cleanup
    return () => {
      clearInterval(interval)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      setOffline()
    }
  }, [pathname])
}
