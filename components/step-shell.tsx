import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { UserCircle2 } from "lucide-react"

interface StepShellProps {
  step: number
  totalSteps?: number
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  maxWidthClassName?: string
  cardClassName?: string
  headerAction?: ReactNode
}

export function StepShell({
  step,
  totalSteps = 8,
  title,
  subtitle,
  icon,
  children,
  maxWidthClassName = "max-w-md",
  cardClassName,
  headerAction,
}: StepShellProps) {
  const progress = Math.max(0, Math.min(100, Math.round((step / totalSteps) * 100)))

  return (
    <div className="min-h-screen bg-[#eef3f8] px-3 py-4 sm:px-4 sm:py-6" dir="rtl">
      <div className={cn("mx-auto w-full space-y-4", maxWidthClassName)}>
        <header className="flex items-center justify-between rounded-2xl border border-[#d6e2ed] bg-white px-3 py-2">
          <button className="rounded-md border border-[#d2dfeb] bg-[#f7fafc] px-2 py-1 text-[11px] font-bold text-[#1a5676]">
            EN
          </button>

          <div className="flex items-center gap-1.5">
            <img
              src="https://tse2.mm.bing.net/th/id/OIP.Q6RoywSIxzTk4FmYcrdZBAHaDG?rs=1&pid=ImgDetMain&o=7&rm=3"
              alt="bCare"
              className="h-5"
            />
          </div>

          <UserCircle2 className="h-5 w-5 text-[#1a5676]" />
        </header>

        <section className="rounded-2xl border border-[#f2ddbc] bg-[#fff8eb] px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#3a6077]">تتبع الطلب</p>
            <span className="text-base font-extrabold text-[#f59e0b]">{progress}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#d9e4ee]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1b80c2] to-[#145072] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#6b8396]">
            الخطوة {step} من {totalSteps}
          </p>
        </section>

        <section
          className={cn(
            "rounded-[1.75rem] border border-[#dbe6ef] bg-white px-5 py-6 shadow-[0_20px_45px_-28px_rgba(20,66,98,0.45)] sm:px-6 sm:py-7",
            cardClassName,
          )}
        >
          {icon ? (
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1f9] text-[#145072]">
                {icon}
              </div>
            </div>
          ) : null}

          <h1 className="text-center text-2xl font-extrabold text-[#174f70]">{title}</h1>
          {subtitle ? <p className="mt-2 text-center text-sm leading-relaxed text-[#5f788b]">{subtitle}</p> : null}

          <div className="mt-5 space-y-4">{children}</div>
        </section>
      </div>
    </div>
  )
}
