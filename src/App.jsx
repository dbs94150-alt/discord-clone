import { useState } from "react";

export default function App() {
  const [activeChannel, setActiveChannel] = useState("general");

  return (
    <div className="flex h-screen bg-discord-chat text-discord-text text-sm">
      {/* SERVERS */}
      <div className="w-[72px] bg-discord-servers flex flex-col items-center py-3 space-y-3">
        <div className="w-12 h-12 bg-purple-600 rounded-full" />
        <div className="w-12 h-12 bg-purple-600 rounded-full" />
        <div className="w-12 h-12 bg-purple-600 rounded-full" />
      </div>

      {/* CHANNELS */}
      <div className="w-60 bg-discord-sidebar p-3">
        <div className="font-bold mb-4">Mon Serveur</div>

        <div
          onClick={() => setActiveChannel("general")}
          className={`px-2 py-1 rounded cursor-pointer mb-1 ${
            activeChannel === "general"
              ? "bg-discord-hover text-white"
              : "text-discord-muted hover:bg-discord-hover"
          }`}
        >
          # général
        </div>

        <div
          onClick={() => setActiveChannel("videos")}
          className={`px-2 py-1 rounded cursor-pointer ${
            activeChannel === "videos"
              ? "bg-discord-hover text-white"
              : "text-discord-muted hover:bg-discord-hover"
          }`}
        >
          # vidéos
        </div>
      </div>

      {/* CHAT */}
      <div className="flex-1 p-4">
        <div className="font-bold mb-4">
          #{activeChannel}
        </div>

        <div>
          Bienvenue dans le salon <b>#{activeChannel}</b> 👋
        </div>
      </div>
    </div>
  );
}
