"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ArrowRight, Users, BookOpen, Award, Globe, Instagram } from "lucide-react"

const Home = () => {
  const [, setNickname] = useState("")
  const { nickname: authNickname } = useAuth()
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()

  // Kullanıcı adını AuthContext'ten al
  useEffect(() => {
    if (authNickname) {
      setNickname(authNickname)
    }
  }, [authNickname])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      <div className="w-full max-w-md">
        <div className="glass-card shadow-xl py-6 px-8 backdrop-blur-lg animate-fade-in">
          <div className="flex flex-col items-center mb-10 animate-float">
            <img
              src="/owly-logo.svg"
              alt="Owly Logo"
              className="w-28 h-26 mb-6 drop-shadow-lg"
              style={{ animation: "float 3s ease-in-out infinite" }}
            />
            <h1 className="text-5xl font-extrabold mb-3 logo-text">
              <span className="logo-letter inline-block">O</span>
              <span className="logo-letter inline-block">W</span>
              <span className="logo-letter inline-block">L</span>
              <span className="logo-letter inline-block">Y</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg font-medium">İngilizce Kelime Quizi</p>
          </div>

          <div className="space-y-5">
            <button
              onClick={() => navigate("/create-room")}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-4 px-6 rounded-full transition-all duration-300 text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
            >
              <Users className="w-5 h-5" />
              <span>Oda Oluştur</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>

            <button
              onClick={() => navigate("/join-room")}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-4 px-6 rounded-full transition-all duration-300 text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
            >
              <BookOpen className="w-5 h-5" />
              <span>Oda Kodunu Gir</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <Award className="w-6 h-6 text-amber-500 mb-2" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Kelime Bilgini Test Et</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Arkadaşlarınla birlikte eğlenceli bir şekilde İngilizce kelime bilgini geliştir.
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="w-full max-w-md mt-8 text-center">
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-100 dark:border-gray-700 shadow-md">
          <div className="flex justify-center space-x-6 mb-4">
            <img src="/lango.png" alt="Lango Logo" className="w-16 h-16 object-contain" />
            <img src="/hng.png" alt="HNG Logo" className="w-16 h-16 object-contain" />
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Coded by <span className="font-medium text-purple-600 dark:text-purple-400">ATŞ</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All rights reserved <span className="font-medium text-indigo-600 dark:text-indigo-400">Lango®</span>{" "}
              {currentYear}
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <a
              href="https://langocorum.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              aria-label="Website"
              title="Website"
            >
              <Globe className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com/langodilkursu"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              aria-label="Instagram"
              title="Instagram - Lango"
            >
              <Instagram className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home

