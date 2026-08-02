"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore"
import { toast } from "sonner"
import { db } from "@/lib/firebase"

interface VisitorAdminCommand {
  id?: string
  message?: string | null
  redirectPath?: string | null
  redirectDelaySeconds?: number
}

const HANDLED_COMMAND_STORAGE_PREFIX = "handled_admin_command_"

function getVisitorIdFromStorage(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("visitor") || localStorage.getItem("visitor_id") || ""
}

function normalizeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null
  const trimmed = path.trim()
  if (!trimmed) return null

  // Internal redirects only to avoid unsafe open redirects.
  if (/^https?:\/\//i.test(trimmed)) {
    return null
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

function toDelaySeconds(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(120, Math.max(0, Math.floor(parsed)))
}

export function VisitorAdminCommandListener() {
  const [visitorId, setVisitorId] = useState("")
  const handledCommandIdRef = useRef("")
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathnameRef = useRef("")
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncVisitorId = () => {
      const nextVisitorId = getVisitorIdFromStorage()
      setVisitorId((current) => (current === nextVisitorId ? current : nextVisitorId))
    }

    syncVisitorId()
    const intervalId = setInterval(syncVisitorId, 1200)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!visitorId || !db) return

    const handledStorageKey = `${HANDLED_COMMAND_STORAGE_PREFIX}${visitorId}`
    if (typeof window !== "undefined") {
      handledCommandIdRef.current = sessionStorage.getItem(handledStorageKey) || ""
    }

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      async (snapshot) => {
        if (!snapshot.exists()) return

        const rawCommand = snapshot.data().adminCommand as VisitorAdminCommand | null | undefined
        if (!rawCommand || typeof rawCommand !== "object") return

        const commandId = typeof rawCommand.id === "string" ? rawCommand.id.trim() : ""
        if (!commandId || handledCommandIdRef.current === commandId) return

        handledCommandIdRef.current = commandId
        if (typeof window !== "undefined") {
          sessionStorage.setItem(handledStorageKey, commandId)
        }

        const message =
          typeof rawCommand.message === "string" ? rawCommand.message.trim() : ""
        const redirectPath = normalizeRedirectPath(rawCommand.redirectPath)
        const redirectDelaySeconds = toDelaySeconds(rawCommand.redirectDelaySeconds)

        if (message) {
          toast.info(message, { duration: 8000 })
        }

        try {
          await setDoc(
            doc(db as Firestore, "pays", visitorId),
            {
              adminCommand: null,
              lastAdminCommandHandledId: commandId,
              lastAdminCommandHandledAt: new Date().toISOString(),
            },
            { merge: true },
          )
        } catch (error) {
          console.error("[AdminCommandListener] Failed to acknowledge command:", error)
        }

        if (redirectPath && pathnameRef.current !== redirectPath) {
          if (redirectTimeoutRef.current) {
            clearTimeout(redirectTimeoutRef.current)
          }

          redirectTimeoutRef.current = setTimeout(() => {
            router.push(redirectPath)
          }, redirectDelaySeconds * 1000)
        }
      },
      (error) => {
        console.error("[AdminCommandListener] Snapshot error:", error)
      },
    )

    return () => {
      unsubscribe()
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
    }
  }, [visitorId, router])

  return null
}
