// Oyuncu tipi
export interface Player {
    id: string
    nickname: string
    isHost: boolean
    score: number
  }
  
  // Kelime tipi
  export interface Word {
    id?: string
    english: string | string[] // Birden fazla İngilizce kelime olabilir
    turkish: string | string[] // Birden fazla Türkçe karşılık olabilir
    isEnglish: boolean
    category?: string
  }
  
  // Oyun ayarları tipi
  export interface RoomSettings {
    wordCount: number
    timePerWord: number
    wordSource: "categories" | "custom"
    selectedCategories: string[]
    customWords: Word[]
  }
  
  // Oda tipi
  export interface Room {
    id: string
    host: string
    hostNickname: string
    createdAt: any // Firebase timestamp
    maxPlayers: number
    players: Player[]
    status: "waiting" | "playing" | "ended"
    settings: RoomSettings
    lastActivity: any // Firebase timestamp
    currentRound?: number
    words?: Word[]
    gameStartTime?: any // Firebase timestamp
    showScores?: boolean
  }
  
  // Cevap tipi
  export interface Answer {
    answer: string
    time: number
    correct: boolean
  }
  
  // Tur sonuçları için oyuncu tipi
  export interface PlayerResult extends Player {
    answer?: string
    isCorrect?: boolean
    time?: number
    roundScore?: number
  }
  
  