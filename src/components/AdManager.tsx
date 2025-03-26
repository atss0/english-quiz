"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Advertisement from "./Advertisement"

// Reklam pozisyonları
export enum AdPosition {
  HOME_TOP = "home_top",
  HOME_BOTTOM = "home_bottom",
  GAME_RESULTS = "game_results",
  ROOM_SIDEBAR = "room_sidebar",
}

// Reklam slotları ve formatları
const adConfig: Record<
  AdPosition,
  { adType: "banner" | "rectangle" | "vertical" | "mobile"; format: string; style: React.CSSProperties }
> = {
  [AdPosition.HOME_TOP]: {
    adType: "banner",
    format: "auto",
    style: { width: "100%", height: "100px" },
  },
  [AdPosition.HOME_BOTTOM]: {
    adType: "rectangle",
    format: "rectangle",
    style: { width: "100%", height: "250px" },
  },
  [AdPosition.GAME_RESULTS]: {
    adType: "rectangle",
    format: "rectangle",
    style: { width: "100%", minHeight: "250px" },
  },
  [AdPosition.ROOM_SIDEBAR]: {
    adType: "vertical",
    format: "vertical",
    style: { width: "300px", height: "600px" },
  },
}

interface AdManagerProps {
  position: AdPosition
  className?: string
}

const AdManager: React.FC<AdManagerProps> = ({ position, className = "" }) => {
  const [showAd, setShowAd] = useState(true)

  // .env'den reklam gösterme ayarını kontrol et
  const showAdsGlobal = import.meta.env.VITE_SHOW_ADS === "true"

  useEffect(() => {
    // Reklam gösterme mantığı (örn: premium kullanıcılara reklam gösterme)
    const checkUserPremiumStatus = async () => {
      // Burada kullanıcının premium durumunu kontrol edebilirsiniz
      // Örnek: const isPremium = await checkPremiumStatus(currentUser.uid);
      const isPremium = false // Şimdilik herkese reklam göster
      setShowAd(!isPremium && showAdsGlobal)
    }

    checkUserPremiumStatus()
  }, [showAdsGlobal])

  if (!showAd) return null

  const config = adConfig[position]

  return (
    <div className={`ad-manager ${className}`}>
      <Advertisement adType={config.adType} adFormat={config.format} style={config.style} />
    </div>
  )
}

export default AdManager

