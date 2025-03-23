"use client"

import { useState } from "react"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase/config"
import { toast } from "react-hot-toast"
import { Settings, Save, Clock, Hash, BookOpen, Layers, FileText } from "lucide-react"

const categories = ["Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "YDT-YDS"]

interface RoomSettingsProps {
  room: any
  roomId: string
}

const RoomSettings = ({ room, roomId }: RoomSettingsProps) => {
  const [wordCount, setWordCount] = useState(room.settings.wordCount)
  const [timePerWord, setTimePerWord] = useState(room.settings.timePerWord)
  const [wordSource, setWordSource] = useState(room.settings.wordSource)
  const [selectedCategories, setSelectedCategories] = useState(room.settings.selectedCategories)
  const [customWords, setCustomWords] = useState(room.settings.customWords.join("\n"))
  const [isSaving, setIsSaving] = useState(false)

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c: any) => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const saveSettings = async () => {
    if (!roomId) return

    if (wordSource === "categories" && selectedCategories.length === 0) {
      toast.error("En az bir kategori seçmelisiniz")
      return
    }

    if (wordSource === "custom") {
      const words = customWords
        .split("\n")
        .map((line: any) => line.trim())
        .filter((line: any) => line.includes(":"))

      if (words.length < wordCount) {
        toast.error(`En az ${wordCount} kelime girmelisiniz`)
        return
      }
    }

    setIsSaving(true)
    try {
      const roomRef = doc(db, "rooms", roomId)

      const customWordsList = customWords
        .split("\n")
        .map((line: any) => {
          const [turkish, english] = line.split(":").map((part: any) => part.trim())
          if (turkish && english) {
            return {
              turkish,
              english,
              isEnglish: Math.random() > 0.5, // Randomly decide which language to show
            }
          }
          return null
        })
        .filter(Boolean)

      await updateDoc(roomRef, {
        settings: {
          wordCount,
          timePerWord,
          wordSource,
          selectedCategories,
          customWords: customWordsList,
        },
        lastActivity: serverTimestamp(),
      })

      toast.success("Ayarlar kaydedildi")
    } catch (error) {
      console.error("Ayarlar kaydedilirken hata:", error)
      toast.error("Ayarlar kaydedilirken bir hata oluştu")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 animate-slide-up">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
        <Settings className="w-5 h-5 text-indigo-500" />
        <span>Oda Ayarları</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="form-group">
            <label className="label flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-500" />
              Kelime Sayısı
            </label>
            <div className="relative">
              <input
                type="number"
                min="5"
                max="50"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="form-control pr-10 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 text-sm">adet</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="label flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Kelime Başına Süre (saniye)
            </label>
            <div className="relative">
              <input
                type="number"
                min="5"
                max="60"
                value={timePerWord}
                onChange={(e) => setTimePerWord(Number(e.target.value))}
                className="form-control pr-10 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 text-sm">saniye</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="label flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Kelime Kaynağı
            </label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="wordSource"
                  value="categories"
                  checked={wordSource === "categories"}
                  onChange={() => setWordSource("categories")}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <Layers className="w-4 h-4 mr-2 text-indigo-500" />
                <span>Kategoriler</span>
              </label>
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="wordSource"
                  value="custom"
                  checked={wordSource === "custom"}
                  onChange={() => setWordSource("custom")}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                <span>Özel Kelimeler</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          {wordSource === "categories" ? (
            <div>
              <label className="label flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                Kategoriler
              </label>
              <div className="space-y-2 bg-white dark:bg-gray-700 p-4 rounded-3xl shadow-inner max-h-60 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-600">
                {categories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-650 rounded-full transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded-full"
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="label flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Özel Kelimeler (Türkçe:İngilizce formatında)
              </label>
              <textarea
                value={customWords}
                onChange={(e) => setCustomWords(e.target.value)}
                placeholder="elma:apple
kitap:book
mavi:blue"
                className="form-control h-40 font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500 rounded-3xl"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="btn btn-primary flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </button>
      </div>
    </div>
  )
}

export default RoomSettings

