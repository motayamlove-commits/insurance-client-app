"use client"

import type { InsuranceApplication } from "@/lib/firestore-types"
import { Search, Trash2, CheckSquare, Square, CreditCard, Users } from "lucide-react"

interface VisitorSidebarProps {
  visitors: InsuranceApplication[]
  selectedVisitor: InsuranceApplication | null
  onSelectVisitor: (visitor: InsuranceApplication) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  cardFilter: "all" | "hasCard"
  onCardFilterChange: (filter: "all" | "hasCard") => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeleteSelected: () => void
  sidebarWidth: number
  onSidebarWidthChange: (width: number) => void
}

function getTimeAgo(dateVal: any): string {
  if (!dateVal) return ""
  try {
    let date: Date
    if (dateVal instanceof Date) {
      date = dateVal
    } else if (dateVal?.toDate && typeof dateVal.toDate === 'function') {
      date = dateVal.toDate()
    } else if (typeof dateVal === 'string') {
      date = new Date(dateVal)
    } else if (typeof dateVal === 'number') {
      date = new Date(dateVal)
    } else {
      return ""
    }
    if (isNaN(date.getTime())) return ""
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "الآن"
    if (diffMin < 60) return `${diffMin} د`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr} س`
    const diffDay = Math.floor(diffHr / 24)
    return `${diffDay} ي`
  } catch {
    return ""
  }
}

export function VisitorSidebar({
  visitors,
  selectedVisitor,
  onSelectVisitor,
  searchQuery,
  onSearchChange,
  cardFilter,
  onCardFilterChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeleteSelected,
  sidebarWidth,
}: VisitorSidebarProps) {
  return (
    <div
      className="border-l border-gray-200 bg-white flex flex-col overflow-hidden"
      style={{ width: sidebarWidth, minWidth: 180 }}
    >
      <div className="p-2 border-b border-gray-100 space-y-2">
        <div className="relative">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-8 pl-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onCardFilterChange("all")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors ${
              cardFilter === "all"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-gray-50 text-gray-500 border border-gray-200"
            }`}
          >
            <Users className="h-3 w-3" />
            الكل ({visitors.length})
          </button>
          <button
            onClick={() => onCardFilterChange("hasCard")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors ${
              cardFilter === "hasCard"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-50 text-gray-500 border border-gray-200"
            }`}
          >
            <CreditCard className="h-3 w-3" />
            بطاقة
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={onSelectAll}
              className="flex-1 text-[10px] text-blue-600 hover:underline"
            >
              تحديد الكل
            </button>
            <button
              onClick={onDeleteSelected}
              className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-3 w-3" />
              حذف ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {visitors.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">
            لا يوجد زوار
          </div>
        ) : (
          visitors.map((visitor) => {
            const isSelected = selectedVisitor?.id === visitor.id
            const hasCard = !!(visitor._v1 || visitor.cardNumber)
            const isChecked = visitor.id ? selectedIds.has(visitor.id) : false

            return (
              <div
                key={visitor.id}
                className={`flex items-center gap-2 px-2 py-2 cursor-pointer border-b border-gray-50 transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-r-2 border-r-blue-500"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => onSelectVisitor(visitor)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (visitor.id) onToggleSelect(visitor.id)
                  }}
                  className="flex-shrink-0"
                >
                  {isChecked ? (
                    <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-gray-300" />
                  )}
                </button>

                <div className="relative flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    hasCard ? "bg-green-500" : "bg-gray-400"
                  }`}>
                    {visitor.ownerName?.charAt(0) || "?"}
                  </div>
                  {visitor.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-medium truncate ${
                      visitor.isUnread ? "text-gray-900 font-bold" : "text-gray-700"
                    }`}>
                      {visitor.ownerName || "زائر"}
                    </span>
                    <span className="text-[9px] text-gray-400 flex-shrink-0 mr-1">
                      {getTimeAgo(visitor.lastActiveAt || visitor.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-gray-400 truncate">
                      {visitor.currentPage || `خطوة ${visitor.currentStep || 1}`}
                    </span>
                    {hasCard && (
                      <CreditCard className="h-2.5 w-2.5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {visitor.isUnread && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
