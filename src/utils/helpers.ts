import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../firebase/config"

// Generate a random room ID (6 uppercase letters)
export const generateRoomId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Shuffle array (Fisher-Yates algorithm)
export const shuffleArray = (array: any[]) => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

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

    return shuffleArray(words).slice(0, count)
  } catch (error) {
    console.error("Kelimeler getirilirken hata:", error)
    throw error
  }
}

// Calculate score based on time
export const calculateScore = (isCorrect: boolean, timeSpent: number, maxTime: number) => {
  if (!isCorrect) return 0

  const timeBonus = Math.max(maxTime - timeSpent, 0)
  return 100 + timeBonus * 10
}

