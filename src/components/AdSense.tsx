import type React from "react"
import AdSense from "react-adsense"

interface AdProps {
  adSlot: string
  adFormat?: string
  style?: React.CSSProperties
  className?: string
}

const AdComponent: React.FC<AdProps> = ({ adSlot, adFormat = "auto", style = {}, className = "" }) => {
  return (
    <div className={`ad-container ${className}`}>
      <AdSense.Google
        client="ca-pub-XXXXXXXXXXXX" // Google AdSense hesabınızdan alacağınız yayıncı ID
        slot={adSlot}
        style={{ display: "block", ...style }}
        format={adFormat}
        responsive="true"
      />
    </div>
  )
}

export default AdComponent

