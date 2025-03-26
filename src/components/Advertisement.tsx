"use client"

import type React from "react"
import { useEffect, useState } from "react"

interface AdProps {
  adSlot?: string
  adFormat?: string
  style?: React.CSSProperties
  className?: string
  adType?: "banner" | "rectangle" | "vertical" | "mobile"
}

const Advertisement: React.FC<AdProps> = ({ adSlot, adFormat = "auto", style = {}, className = "", adType }) => {
  const [adLoaded, setAdLoaded] = useState(false)
  const [adError, setAdError] = useState(false)

  // .env'den reklam gösterme ayarını ve ortamı kontrol et
  const showAds = import.meta.env.VITE_SHOW_ADS === "true"
  const isProduction = import.meta.env.MODE === "production"
  const shouldShowAds = showAds && isProduction

  // Slot ID'sini belirle
  const getSlotId = (): string => {
    if (adSlot) return adSlot

    switch (adType) {
      case "banner":
        return import.meta.env.VITE_ADSENSE_BANNER_SLOT
      case "rectangle":
        return import.meta.env.VITE_ADSENSE_RECTANGLE_SLOT
      case "vertical":
        return import.meta.env.VITE_ADSENSE_VERTICAL_SLOT
      case "mobile":
        return import.meta.env.VITE_ADSENSE_MOBILE_SLOT
      default:
        return import.meta.env.VITE_ADSENSE_BANNER_SLOT
    }
  }

  useEffect(() => {
    if (shouldShowAds) {
      // AdSense kodunu yükle
      try {
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})

        // 2 saniye sonra yükleme durumunu kontrol et
        const timer = setTimeout(() => {
          const adElement = document.querySelector(".adsbygoogle")
          if (adElement && window.getComputedStyle(adElement).height !== "0px") {
            setAdLoaded(true)
          } else {
            setAdError(true)
          }
        }, 2000)

        return () => clearTimeout(timer)
      } catch (e) {
        console.error("AdSense hata:", e)
        setAdError(true)
      }
    }
  }, [shouldShowAds])

  // Reklamlar kapalıysa veya production ortamında değilsek hiçbir şey gösterme
  if (!shouldShowAds) return null

  return (
    <div
      className={`ad-container bg-gray-100 dark:bg-gray-700 p-2 rounded-lg min-h-[120px] flex flex-col items-center justify-center ${className}`}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center">Reklam</p>

      {adError ? (
        <div className="text-center p-2">
          <p className="text-sm text-red-500">Reklam yüklenemedi</p>
          <p className="text-xs text-gray-500 mt-1">Reklam engelleyici kullanıyor olabilirsiniz</p>
        </div>
      ) : (
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            textAlign: "center",
            width: "100%",
            height: adType === "rectangle" ? "250px" : "100px",
            background: adLoaded ? "transparent" : "#f0f0f0",
            ...style,
          }}
          data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}
          data-ad-slot={getSlotId()}
          data-ad-format={adFormat}
          data-full-width-responsive="true"
        />
      )}
    </div>
  )
}

export default Advertisement

