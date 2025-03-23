"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "react-hot-toast"
import { generateRoomId } from "../utils/helpers"
import { getAuth } from "firebase/auth"
import { ArrowLeft, Users, Settings, Crown } from "lucide-react"

const CreateRoom = () => {
  const [nickname, setNickname] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [maxPlayers, setMaxPlayers] = useState(4)
  const { signIn, currentUser, nickname: authNickname, updateNickname } = useAuth()
  const navigate = useNavigate()
  const auth = getAuth()

  // Kullanıcı adını AuthContext'ten al
  useEffect(() => {
    if (authNickname) {
      setNickname(authNickname)
    }
  }, [authNickname])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) {
      toast.error("Lütfen bir takma ad girin")
      return
    }

    setIsCreating(true)
    try {
      // Eğer kullanıcı giriş yapmışsa ve nickname değiştiyse, güncelle
      if (currentUser && nickname !== authNickname) {
        await updateNickname(nickname)
      } else if (!currentUser) {
        await signIn(nickname)
      }

      const newRoomId = generateRoomId()
      const roomRef = doc(db, "rooms", newRoomId)

      await setDoc(roomRef, {
        id: newRoomId,
        host: auth.currentUser?.uid,
        hostNickname: nickname,
        createdAt: serverTimestamp(),
        maxPlayers,
        players: [
          {
            id: auth.currentUser?.uid,
            nickname,
            isHost: true,
            score: 0,
          },
        ],
        status: "waiting",
        settings: {
          wordCount: 15,
          timePerWord: 15,
          wordSource: "categories", // 'categories' or 'custom'
          selectedCategories: ["Beginner"],
          customWords: [],
        },
        lastActivity: serverTimestamp(),
      })

      navigate(`/room/${newRoomId}`)
    } catch (error) {
      console.error("Oda oluşturulurken hata:", error)
      toast.error("Oda oluşturulurken bir hata oluştu")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      <div className="w-full max-w-md">
        <div className="glass-card shadow-xl p-8 backdrop-blur-lg animate-fade-in">
          <div className="flex items-center justify-center mb-8">
            <img
              src="/owly-logo.svg"
              alt="Owly Logo"
              className="w-14 h-14 mr-3 drop-shadow-lg"
              style={{ animation: "float 3s ease-in-out infinite" }}
            />
            <h1
              className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{ animation: "glow 2s ease-in-out infinite alternate" }}
            >
              Oda Oluştur
            </h1>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-5">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4 inline mr-2" />
                Takma Adınız
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="form-control focus:ring-indigo-500 focus:border-indigo-500 shadow-md"
                placeholder="Takma adınızı girin"
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Crown className="w-4 h-4 inline mr-2" />
                Maksimum Oyuncu
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="form-control focus:ring-indigo-500 focus:border-indigo-500 shadow-md"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} Oyuncu
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Geri</span>
              </button>
              <button
                type="submit"
                disabled={isCreating || !nickname}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <Settings className="w-5 h-5" />
                {isCreating ? "Oluşturuluyor..." : "Oda Oluştur"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateRoom

