"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

const AdBlockChecker = () => {
  // .env'den reklam gösterme ayarını ve ortamı kontrol et
  const showAds = import.meta.env.VITE_SHOW_ADS === "true"
  const isProduction = import.meta.env.MODE === "production"
  const shouldShowAds = showAds && isProduction

  const [isBlocked, setIsBlocked] = useState<boolean | null>(null)
  const [showMessage, setShowMessage] = useState(true)

  useEffect(() => {
    // Reklamlar kapalıysa veya production ortamında değilsek hiçbir şey yapma
    if (!shouldShowAds) return

    const checkAdBlocker = async () => {
      try {
        // Daha basit ve güvenli bir AdBlock tespit yöntemi kullanalım
        let isAdBlocked = false

        // Yöntem 1: Sahte reklam elementi
        const fakeAd = document.createElement("div")
        fakeAd.className = "adsbygoogle"
        fakeAd.style.height = "1px"
        fakeAd.style.position = "absolute"
        fakeAd.style.top = "-10000px"
        document.body.appendChild(fakeAd)

        // Yöntem 2: Bilinen AdBlock tarafından engellenen class adları
        const baitElement = document.createElement("div")
        baitElement.className = "ad-placement ad-banner textads banner-ads"
        baitElement.style.height = "1px"
        baitElement.style.width = "1px"
        baitElement.style.position = "absolute"
        baitElement.style.left = "-10000px"
        baitElement.style.top = "-10000px"
        document.body.appendChild(baitElement)

        // Biraz bekle
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Elementleri kontrol et
        isAdBlocked =
          fakeAd.offsetHeight === 0 ||
          window.getComputedStyle(fakeAd).display === "none" ||
          window.getComputedStyle(fakeAd).visibility === "hidden" ||
          baitElement.offsetHeight === 0 ||
          window.getComputedStyle(baitElement).display === "none"

        setIsBlocked(isAdBlocked)

        // Temizlik
        if (document.body.contains(fakeAd)) {
          document.body.removeChild(fakeAd)
        }
        if (document.body.contains(baitElement)) {
          document.body.removeChild(baitElement)
        }

        console.log("Ad blocker detected:", isAdBlocked)
      } catch (error) {
        console.error("Error checking for ad blocker:", error)
        // Hata durumunda sessizce devam et, varsayılan olarak false
        setIsBlocked(false)
      }
    }

    // Hata olmaması için try-catch içinde çağıralım
    try {
      checkAdBlocker()
    } catch (error) {
      console.error("AdBlock check failed:", error)
    }

    // 5 saniye sonra mesajı gizle
    const timer = setTimeout(() => {
      setShowMessage(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [shouldShowAds])

  // Reklamlar kapalıysa, production ortamında değilsek, mesaj gösterilmeyecekse
  // veya henüz tespit yapılmadıysa hiçbir şey gösterme
  if (!shouldShowAds || !showMessage || isBlocked === null) return null

  // Sadece reklamlar açıksa ve reklam engelleyici tespit edildiyse uyarı göster
  if (isBlocked) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/80 p-4 rounded-lg shadow-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-300">Reklam engelleyici tespit edildi</h3>
              <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                Uygulamamızı ücretsiz tutabilmek için lütfen reklamlara izin verin.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reklamlar açık ve reklam engelleyici yoksa, "Reklamlar etkin" mesajını göster
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs animate-fade-in">
      <div className="bg-green-50 dark:bg-green-900/80 p-4 rounded-lg shadow-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs">✓</span>
          </div>
          <div>
            <h3 className="font-medium text-green-800 dark:text-green-300">Reklamlar etkin</h3>
            <p className="text-sm text-green-700 dark:text-green-200 mt-1">Desteğiniz için teşekkür ederiz!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdBlockChecker

