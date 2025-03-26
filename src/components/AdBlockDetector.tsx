"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AlertTriangle } from "lucide-react"

const AdBlockDetector: React.FC = () => {
  // .env'den reklam gösterme ayarını kontrol et
  const showAds = import.meta.env.VITE_SHOW_ADS === "true"
  const [adBlockDetected, setAdBlockDetected] = useState(false)

  useEffect(() => {
    const detectAdBlock = async () => {
      try {
        // Basit bir adblock tespiti
        const testAd = document.createElement("div")
        testAd.innerHTML = "&nbsp;"
        testAd.className = "adsbox"
        document.body.appendChild(testAd)

        // Kısa bir süre bekle
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Eğer reklam engelleyici varsa, bu element gizlenecektir
        const isBlocked = testAd.offsetHeight === 0
        setAdBlockDetected(isBlocked)

        // Test elementini temizle
        document.body.removeChild(testAd)
      } catch (e) {
        console.error("AdBlock tespiti sırasında hata:", e)
      }
    }

    if (showAds) {
      detectAdBlock()
    }
  }, [showAds])

  // Eğer reklamlar kapalıysa bileşeni gösterme
  if (!showAds) {
    return null
  }

  if (!adBlockDetected) return null

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
        Reklam engelleyici kullandığınızı tespit ettik. Uygulamamızı ücretsiz tutabilmek için lütfen reklamlara izin
        verin.
      </p>
    </div>
  )
}

export default AdBlockDetector

