import { useState } from "react";

const channels = [
  { id: "general", name: "général" },
  { id: "videos", name: "vidéos" },
];

export default function App() {
  const [activeChannel, setActiveChannel] = useState("general");

  return (
    <div className="flex h-screen text-sm">
      {/* SERVERS */}
      <div className="w-[72px] bg-discord-servers flex flex-col items-center py-3 space-y-3">
        <div className="w-12 h-12 bg-purple-600 rounded-full" />
        <div className="w-12 h-12 bg-purple-600 rounded-full" />
        <div className="w-12 h-12 bg-purple-600 rounded-full" />
      </div>

      {/* CHANNELS */}
      <div className="w-60 bg-discord-sidebar p-3">
        <div className="font-bold mb-4">Mon Serveur</div>

        {channels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => setActiveChannel(channel.id)}
            className={`px-2 py-1 rounded cursor-pointer mb-1
              ${
                activeChannel === channel.id
                  ? "bg-discord-hover text-white"
                  : "text-discord-muted hover:bg-discord-hover"
              }`}
          >
            # {channel.name}
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div className="flex-1 bg-discord-chat p-4">
        <div className="font-bold mb-4">
          # {channels.find(c => c.id === activeChannel).name}
        </div>

        <div>
          Bienvenue dans <b>#{activeChannel}</b> 👋
        </div>
      </div>
