declare module "react-adsense" {
    import React from "react"
  
    interface AdSenseProps {
      client: string
      slot: string
      style?: React.CSSProperties
      format?: string
      responsive?: string
      layoutKey?: string
      className?: string
    }
  
    class AdSense extends React.Component<AdSenseProps> {}
  
    namespace AdSense {
      class Google extends React.Component<AdSenseProps> {}
    }
  
    export default AdSense
  }
  
  