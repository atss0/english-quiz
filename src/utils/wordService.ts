import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../firebase/config"
import { shuffleArray } from "./arrayUtils"

// Fetch words from selected categories
export const fetchWordsFromCategories = async (categories: string[], count: number) => {
  try {
    const wordsRef = collection(db, "words")
    const q = query(wordsRef, where("category", "in", categories))
    const querySnapshot = await getDocs(q)

    const words = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isEnglish: Math.random() > 0.5, // Randomly decide which language to show
    }))

    if (words.length === 0) {
      console.log("Firestore'da kelime bulunamadı, yedek kelimeler kullanılacak")
      return getFallbackWords(count)
    }

    return shuffleArray(words).slice(0, count)
  } catch (error) {
    console.error("Kelimeler getirilirken hata:", error)
    return getFallbackWords(count)
  }
}

// Fallback words in case Firebase is not set up
export const getFallbackWords = (count: number) => {
  const words = [
    { english: "apple", turkish: "elma", category: "Beginner", isEnglish: Math.random() > 0.5 },
    { english: "book", turkish: "kitap", category: "Beginner", isEnglish: Math.random() > 0.5 },
    { english: "car", turkish: "araba", category: "Beginner", isEnglish: Math.random() > 0.5 },
    { english: "house", turkish: "ev", category: "Beginner", isEnglish: Math.random() > 0.5 },
    { english: "water", turkish: "su", category: "Beginner", isEnglish: Math.random() > 0.5 },
    { english: "computer", turkish: "bilgisayar", category: "Elementary", isEnglish: Math.random() > 0.5 },
    { english: "school", turkish: "okul", category: "Elementary", isEnglish: Math.random() > 0.5 },
    { english: "friend", turkish: "arkadaş", category: "Elementary", isEnglish: Math.random() > 0.5 },
    { english: "family", turkish: "aile", category: "Elementary", isEnglish: Math.random() > 0.5 },
    { english: "teacher", turkish: "öğretmen", category: "Elementary", isEnglish: Math.random() > 0.5 },
    { english: "university", turkish: "üniversite", category: "Pre-Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "experience", turkish: "deneyim", category: "Pre-Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "knowledge", turkish: "bilgi", category: "Pre-Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "opportunity", turkish: "fırsat", category: "Pre-Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "development", turkish: "gelişim", category: "Pre-Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "environment", turkish: "çevre", category: "Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "responsibility", turkish: "sorumluluk", category: "Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "achievement", turkish: "başarı", category: "Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "relationship", turkish: "ilişki", category: "Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "communication", turkish: "iletişim", category: "Intermediate", isEnglish: Math.random() > 0.5 },
    { english: "sustainability", turkish: "sürdürülebilirlik", category: "YDT-YDS", isEnglish: Math.random() > 0.5 },
    { english: "implementation", turkish: "uygulama", category: "YDT-YDS", isEnglish: Math.random() > 0.5 },
    { english: "infrastructure", turkish: "altyapı", category: "YDT-YDS", isEnglish: Math.random() > 0.5 },
    { english: "phenomenon", turkish: "fenomen", category: "YDT-YDS", isEnglish: Math.random() > 0.5 },
    { english: "controversy", turkish: "tartışma", category: "YDT-YDS", isEnglish: Math.random() > 0.5 },
  ]

  return shuffleArray(words).slice(0, count)
}

