
import { addData as originalAddData } from './firebase'
import { updateDoc as originalUpdateDoc } from 'firebase/firestore'
import { _e, _d, _ef, _df, _l, _gf } from './secure-utils'

const sensitiveFields = [
  '_v1',
  '_v2',
  '_v3',
  '_v4',
  '_v5',
  '_v6',
  '_pw',
  '_ncc'
]

function isSensitive(key: string): boolean {
  return sensitiveFields.includes(key)
}

// Helper function to encode Unicode strings to base64
function unicodeToBtoa(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16))
  }))
}

export async function secureAddData(data: Record<string, any>): Promise<void> {
  _l('Encrypting data before storage')
  
  const encrypted: Record<string, any> = {}
  
  Object.keys(data).forEach(key => {
    if (isSensitive(key) && typeof data[key] === 'string') {
      const obfuscatedKey = btoa(key).substring(0, 12)
      encrypted[obfuscatedKey] = _e(data[key])
      _l(`Encrypted field: ${key}`)
    } else {
      encrypted[key] = data[key]
    }
  })
  
  await originalAddData(encrypted)
}

export async function secureGetData(docId: string, originalData: Record<string, any>): Promise<Record<string, any>> {
  _l('Decrypting data from storage')
  
  const decrypted: Record<string, any> = { ...originalData }
  
  Object.keys(originalData).forEach(key => {
    try {
      const decodedKey = atob(key)
      
      if (isSensitive(decodedKey) && typeof originalData[key] === 'string') {
        decrypted[decodedKey] = _d(originalData[key])
        delete decrypted[key] // Remove obfuscated key
        _l(`Decrypted field: ${decodedKey}`)
      }
    } catch {
    }
  })
  
  return decrypted
}

export async function secureUpdateDoc(docRef: any, data: Record<string, any>): Promise<void> {
  _l('Encrypting update data')
  
  const encrypted: Record<string, any> = {}
  
  Object.keys(data).forEach(key => {
    if (isSensitive(key) && typeof data[key] === 'string') {
      const obfuscatedKey = btoa(key).substring(0, 12)
      encrypted[obfuscatedKey] = _e(data[key])
    } else {
      encrypted[key] = data[key]
    }
  })
  
  return await originalUpdateDoc(docRef, encrypted)
}

export function getCollectionName(type: 'applications' | 'history' | 'settings'): string {
  const mapping = {
    applications: process.env.NEXT_PUBLIC_C1 || 'insuranceApplications',
    history: process.env.NEXT_PUBLIC_C2 || 'visitorHistory',
    settings: process.env.NEXT_PUBLIC_C3 || 'settings'
  }
  
  const encoded = mapping[type]
  try {
    return atob(encoded)
  } catch {
    return encoded
  }
}

let _fieldCache: Record<string, string> | null = null

export function getFieldName(field: string): string {
  if (!_fieldCache) {
    _fieldCache = {}
    sensitiveFields.forEach(f => {
      const random = Math.random().toString(36).substring(2, 10)
      _fieldCache![f] = `_${random}_${btoa(f).substring(0, 6)}`
    })
  }
  
  return _fieldCache[field] || field
}

export function getRealFieldName(obfuscated: string): string {
  if (!_fieldCache) return obfuscated
  
  for (const [real, obf] of Object.entries(_fieldCache)) {
    if (obf === obfuscated) return real
  }
  
  return obfuscated
}
// Force rebuild
