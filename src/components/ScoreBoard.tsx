"use client"

import { useMemo } from "react"
import { Trophy, Medal } from "lucide-react"

interface Player {
  id: string
  nickname: string
  isHost: boolean
  score: number
}

interface ScoreBoardProps {
  players: Player[]
}

const ScoreBoard = ({ players }: ScoreBoardProps) => {
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score)
  }, [players])

  // Puan sıralamasına göre madalya renkleri
  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500" // Altın
      case 1:
        return "text-gray-400" // Gümüş
      case 2:
        return "text-amber-700" // Bronz
      default:
        return "text-gray-300 dark:text-gray-600" // Diğerleri
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <span className="text-indigo-600 dark:text-indigo-400">Skor Tablosu</span>
      </h2>

      <div className="overflow-hidden rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-4">
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-2 sm:col-span-1 text-center font-medium">#</div>
            <div className="col-span-6 sm:col-span-7 font-medium">Oyuncu</div>
            <div className="col-span-4 text-right font-medium">Puan</div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto custom-scrollbar">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`grid grid-cols-12 gap-2 items-center py-3 px-4 ${
                index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-700 dark:bg-gray-750"
              } hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors duration-150`}
            >
              <div className="col-span-2 sm:col-span-1 text-center font-medium flex justify-center">
                {index < 3 ? (
                  <Medal className={`w-5 h-5 ${getMedalColor(index)}`} />
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">{index + 1}</span>
                )}
              </div>
              <div className="col-span-6 sm:col-span-7 truncate">
                <div className="flex items-center">
                  <span
                    className={`font-medium truncate ${
                      player.isHost ? "text-indigo-600 dark:text-indigo-400" : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {player.nickname}
                  </span>
                  {player.isHost && (
                    <span className="ml-2 hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                      Oda Sahibi
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-4 text-right font-bold text-lg">
                <span className="text-emerald-600 dark:text-emerald-400">{player.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ScoreBoard

