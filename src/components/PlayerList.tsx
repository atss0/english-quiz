"use client"

import { UserCircle, Crown, Shield, Award, UserX } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useState } from "react"
import { Users } from "lucide-react"

interface Player {
  id: string
  nickname: string
  isHost: boolean
  score: number
}

interface PlayerListProps {
  players: Player[]
  isHost: boolean
  onKickPlayer?: (playerId: string) => void
}

const PlayerList = ({ players, isHost, onKickPlayer }: PlayerListProps) => {
  const { currentUser } = useAuth()
  const [kickConfirm, setKickConfirm] = useState<string | null>(null)

  const handleKickClick = (playerId: string) => {
    if (kickConfirm === playerId) {
      // Kullanıcı zaten onay bekliyor, şimdi gerçekten at
      onKickPlayer?.(playerId)
      setKickConfirm(null)
    } else {
      // İlk tıklama, onay iste
      setKickConfirm(playerId)
      // 3 saniye sonra onay durumunu sıfırla
      setTimeout(() => {
        setKickConfirm(null)
      }, 3000)
    }
  }

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
        <Users className="w-5 h-5" />
        Oyuncular ({players.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        {players.map((player) => {
          const isCurrentUser = player.id === currentUser?.uid

          return (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-4 rounded-full transition-all duration-300 ${
                isCurrentUser
                  ? "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800"
                  : "bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-750 border border-gray-100 dark:border-gray-600"
              } shadow-sm`}
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isCurrentUser ? "bg-indigo-100 dark:bg-indigo-800" : "bg-gray-100 dark:bg-gray-600"
                  }`}
                >
                  <UserCircle
                    className={`w-8 h-8 ${isCurrentUser ? "text-indigo-600 dark:text-indigo-300" : "text-gray-600 dark:text-gray-300"}`}
                  />
                </div>
                {player.isHost && (
                  <div className="absolute -top-1 -right-1 bg-amber-100 dark:bg-amber-900 p-1 rounded-full border-2 border-white dark:border-gray-800">
                    <Crown className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  </div>
                )}
                {player.score > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-emerald-100 dark:bg-emerald-900 p-1 rounded-full border-2 border-white dark:border-gray-800">
                    <Award className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center text-gray-900 dark:text-gray-100 truncate">
                  {player.nickname}
                  {isCurrentUser && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-medium">
                      Sen
                    </span>
                  )}
                </div>
                <div className="flex items-center mt-1">
                  {player.isHost ? (
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center">
                      <Shield className="w-3 h-3 mr-1" /> Oda Sahibi
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-300">Oyuncu</div>
                  )}
                  {player.score > 0 && (
                    <div className="ml-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {player.score} puan
                    </div>
                  )}
                </div>
              </div>

              {/* Oyuncu atma butonu - sadece oda sahibi için ve kendisi olmayan oyuncular için göster */}
              {isHost && !isCurrentUser && !player.isHost && (
                <button
                  onClick={() => handleKickClick(player.id)}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    kickConfirm === player.id
                      ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 animate-pulse"
                      : "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400"
                  }`}
                  title={kickConfirm === player.id ? "Onaylamak için tekrar tıklayın" : "Oyuncuyu At"}
                >
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlayerList

