"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { subscribeToMessages, sendMessage } from "@/lib/firebase-services"
import type { ChatMessage } from "@/lib/firestore-types"

interface ChatPanelProps {
  applicationId: string
  currentUserId: string
  currentUserName: string
  currentUserRole: "customer" | "professional" | "admin"
  onClose?: () => void
}

export function ChatPanel({ applicationId, currentUserId, currentUserName, currentUserRole, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = subscribeToMessages(applicationId, (msgs) => {
      setMessages(msgs)
    })
    return () => unsubscribe()
  }, [applicationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await sendMessage({
        applicationId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: currentUserRole,
        message: newMessage.trim(),
        read: false,
      })
      setNewMessage("")
    } catch (error) {
      console.error(" Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "professional":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "مسؤول"
      case "professional":
        return "محترف"
      default:
        return "عميل"
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-slate-50">
        <div>
          <h3 className="text-lg font-bold text-slate-900">الدردشة</h3>
          <p className="text-sm text-slate-600">رقم الطلب: {applicationId?.slice(0, 8)}</p>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>لا توجد رسائل بعد</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.senderId === currentUserId
            return (
              <div key={msg.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] ${isCurrentUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{msg.senderName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(msg.senderRole)}`}>
                      {getRoleBadge(msg.senderRole)}
                    </span>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isCurrentUser ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {msg.timestamp &&
                      new Date(msg.timestamp.toISOString()).toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-slate-50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="flex-1 h-11 text-right"
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
