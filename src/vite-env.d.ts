/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_DATABASE_URL: string

  // Google AdSense
  readonly VITE_SHOW_ADS: string
  readonly VITE_ADSENSE_CLIENT_ID: string
  readonly VITE_ADSENSE_BANNER_SLOT: string
  readonly VITE_ADSENSE_RECTANGLE_SLOT: string
  readonly VITE_ADSENSE_VERTICAL_SLOT: string
  readonly VITE_ADSENSE_MOBILE_SLOT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

