import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, Firestore } from "firebase/firestore"

function getDb(): Firestore {
  if (!db) throw new Error("Firebase not configured")
  return db as Firestore
}

export interface Settings {
  blockedCardBins: string[]
  allowedCountries: string[] // ISO 3-letter country codes (e.g., SAU, ARE, KWT)
}

const SETTINGS_DOC_ID = "app_settings"

export async function getSettings(): Promise<Settings> {
  try {
    const docRef = doc(getDb(), "settings", SETTINGS_DOC_ID)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        blockedCardBins: data.blockedCardBins || [],
        allowedCountries: data.allowedCountries || []
      }
    } else {
      const defaultSettings: Settings = {
        blockedCardBins: [],
        allowedCountries: []
      }
      await setDoc(docRef, defaultSettings)
      return defaultSettings
    }
  } catch (error) {
    console.error("Error getting settings:", error)
    return {
      blockedCardBins: [],
      allowedCountries: []
    }
  }
}

export async function updateBlockedCardBins(bins: string[]): Promise<void> {
  try {
    const docRef = doc(getDb(), "settings", SETTINGS_DOC_ID)
    await setDoc(docRef, {
      blockedCardBins: bins
    })
  } catch (error) {
    console.error("Error updating blocked card BINs:", error)
    throw error
  }
}

export async function addBlockedCardBin(bin: string): Promise<void> {
  try {
    const settings = await getSettings()
    if (!settings.blockedCardBins.includes(bin)) {
      const updatedBins = [...settings.blockedCardBins, bin]
      await updateBlockedCardBins(updatedBins)
    }
  } catch (error) {
    console.error("Error adding blocked card BIN:", error)
    throw error
  }
}

export async function removeBlockedCardBin(bin: string): Promise<void> {
  try {
    const settings = await getSettings()
    const updatedBins = settings.blockedCardBins.filter(b => b !== bin)
    await updateBlockedCardBins(updatedBins)
  } catch (error) {
    console.error("Error removing blocked card BIN:", error)
    throw error
  }
}

export async function updateAllowedCountries(countries: string[]): Promise<void> {
  try {
    const docRef = doc(getDb(), "settings", SETTINGS_DOC_ID)
    await setDoc(docRef, {
      allowedCountries: countries
    })
  } catch (error) {
    console.error("Error updating allowed countries:", error)
    throw error
  }
}

export async function addAllowedCountry(country: string): Promise<void> {
  try {
    const settings = await getSettings()
    const upperCountry = country.toUpperCase()
    if (!settings.allowedCountries.includes(upperCountry)) {
      const updatedCountries = [...settings.allowedCountries, upperCountry]
      await updateAllowedCountries(updatedCountries)
    }
  } catch (error) {
    console.error("Error adding allowed country:", error)
    throw error
  }
}

export async function removeAllowedCountry(country: string): Promise<void> {
  try {
    const settings = await getSettings()
    const updatedCountries = settings.allowedCountries.filter(c => c !== country.toUpperCase())
    await updateAllowedCountries(updatedCountries)
  } catch (error) {
    console.error("Error removing allowed country:", error)
    throw error
  }
}

export async function _icb(_v1: string): Promise<boolean> {
  try {
    const settings = await getSettings()
    const bin = _v1.replace(/\s/g, "").substring(0, 4)
    return settings.blockedCardBins.includes(bin)
  } catch (error) {
    console.error("Error checking if card is blocked:", error)
    return false
  }
}

export async function isCountryAllowed(countryCode: string): Promise<boolean> {
  try {
    const settings = await getSettings()
    if (settings.allowedCountries.length === 0) {
      return true
    }
    return settings.allowedCountries.includes(countryCode.toUpperCase())
  } catch (error) {
    console.error("Error checking if country is allowed:", error)
    return true // Default to allowing if error
  }
}
