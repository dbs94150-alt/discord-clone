export default function App() {
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

        <div className="text-discord-muted hover:bg-discord-hover px-2 py-1 rounded cursor-pointer">
          # général
        </div>
        <div className="text-discord-muted hover:bg-discord-hover px-2 py-1 rounded cursor-pointer">
          # vidéos
        </div>
      </div>

      {/* CHAT */}
      <div className="flex-1 bg-discord-chat p-4">
        <div className="font-bold mb-4"># général</div>
        <div>Bienvenue sur le clone Discord 👋</div>
      </div>
    </div>
  );
}
