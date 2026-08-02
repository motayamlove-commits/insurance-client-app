"use client"

export function DashboardHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src="https://tse2.mm.bing.net/th/id/OIP.Q6RoywSIxzTk4FmYcrdZBAHaDG?rs=1&pid=ImgDetMain&o=7&rm=3"
          alt="bCare"
          className="h-6"
        />
        <span className="text-sm font-bold text-[#1a5676]">لوحة التحكم</span>
      </div>
    </header>
  )
}
