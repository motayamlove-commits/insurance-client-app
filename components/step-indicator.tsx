import { Check, User, Shield, List, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

const steps = [
  { id: 1, label: "البيانات الشخصية", icon: User },
  { id: 2, label: "بيانات التأمين", icon: Shield },
  { id: 3, label: "العروض المتاحة", icon: List },
  { id: 4, label: "الدفع", icon: CreditCard },
];

export function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  return (
    <div className="w-full" data-testid="step-indicator" dir="rtl">
      {/* Desktop version */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between relative px-4 py-6">
          {/* Progress line background */}
          <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-white/20 -translate-y-1/2 mx-16 rounded-full" />
          
          {/* Progress line fill */}
          <div 
            className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 -translate-y-1/2 mx-16 transition-all duration-700 ease-out rounded-full shadow-lg shadow-amber-400/30"
            style={{ width: `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - 8rem)` }}
          />

          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center relative z-10 transition-all duration-300",
                  isCurrent && "scale-110"
                )}
                data-testid={`step-${step.id}`}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border-4",
                    isCompleted && "bg-gradient-to-br from-[#0a4a68] to-[#0d5a7d] border-[#0a4a68] shadow-lg shadow-[#0a4a68]/40",
                    isCurrent && "bg-white border-amber-400 shadow-xl shadow-amber-400/30 animate-pulse-glow",
                    !isCompleted && !isCurrent && "bg-white/10 border-white/30 backdrop-blur-sm"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-7 h-7 text-white drop-shadow-md" strokeWidth={3} />
                  ) : (
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-all duration-300",
                        isCurrent ? "text-[#0a4a68] scale-110" : "text-white/60"
                      )}
                    />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "mt-4 text-sm font-bold text-center whitespace-nowrap transition-all duration-300",
                    isCompleted && "text-white",
                    isCurrent && "text-amber-400 text-base",
                    !isCompleted && !isCurrent && "text-white/50"
                  )}
                  dir="rtl"
                >
                  {step.label}
                </span>

                {/* Step number badge */}
                <span
                  className={cn(
                    "absolute -top-1 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-md transition-all duration-300",
                    isCompleted && "bg-gradient-to-br from-green-400 to-green-600 text-white",
                    isCurrent && "bg-gradient-to-br from-amber-400 to-yellow-500 text-[#0a4a68] scale-110",
                    !isCompleted && !isCurrent && "bg-white/20 text-white/70"
                  )}
                >
                  {step.id}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile version */}
      <div className="md:hidden">
        <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md rounded-2xl p-5 mx-3 border border-white/20 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3" dir="rtl">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0a4a68] to-[#0d5a7d] flex items-center justify-center border-3 border-amber-400 shadow-lg shadow-amber-400/20 animate-pulse-glow">
                {(() => {
                  const CurrentIcon = steps[currentStep - 1]?.icon || User;
                  return <CurrentIcon className="w-6 h-6 text-white" />;
                })()}
              </div>
              <div>
                <p className="text-white text-base font-bold">
                  {steps[currentStep - 1]?.label}
                </p>
                <p className="text-white/60 text-sm">
                  الخطوة {currentStep} من {totalSteps}
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a4a68] px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-amber-400/30">
              {Math.round((currentStep / totalSteps) * 100)}%
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-yellow-500 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            >
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  currentStep >= step.id 
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm shadow-amber-400/50" 
                    : "bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
