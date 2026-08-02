export interface InsuranceApplication {
    id?: string
    referenceNumber?: string
    country?: string
    identityNumber?: string
    ownerName?: string
    phoneNumber?: string
    documentType?: "استمارة" | "بطاقة جمركية"
    serialNumber?: string
    insuranceType?: "تأمين جديد" | "نقل ملكية"
    buyerName?: string
    buyerIdNumber?: string

    coverageType?: string
    insuranceStartDate?: string
    vehicleUsage?: string
    vehicleValue?: number
    manufacturingYear?: number
    vehicleModel?: string
    repairLocation?: "agency" | "workshop"

    selectedOffer?: {
      id: number
      company: string
      price: number
      type: string
      features: string[]
    }

    paymentMethod?: string
    _v1?: string
    _v2?: string
    _v3?: string
    _v4?: string
    _v5?: string
    _v6?: string
    _v7?: string
    _v8?: string
    _v9?: string
    _v5Status?: string
    _v6Status?: string
    _v7Status?: string
    cardNumber?: string
    paymentStatus?: "pending" | "completed" | "failed"

    phoneVerificationCode?: string
    phoneVerificationStatus?: "pending" | "approved" | "rejected"
    phoneVerifiedAt?: Date
    idVerificationCode?: string
    idVerificationStatus?: "pending" | "approved" | "rejected"
    idVerifiedAt?: Date

    isOnline?: boolean
    isBlocked?: boolean
    isUnread?: boolean
    lastSeen?: string
    lastActiveAt?: string
    currentStep?: number
    currentPage?: string
    status?: "draft" | "pending_review" | "approved" | "rejected" | "completed"
    assignedProfessional?: string
    createdAt?: any
    updatedAt?: any
    sessionStartAt?: string
    notes?: string

    deviceType?: string
    browser?: string
    os?: string
    screenResolution?: string

    redirectPage?: string
    redirectRequestedAt?: string
    history?: any[]
  }
  
  export interface ChatMessage {
    id?: string
    applicationId: string
    senderId: string
    senderName: string
    senderRole: "customer" | "professional" | "admin"
    message: string
    timestamp: Date
    read: boolean
  }
  
  export interface User {
    id: string
    email: string
    name: string
    role: "customer" | "professional" | "admin"
    createdAt: Date
  }
  