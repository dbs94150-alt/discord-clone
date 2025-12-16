function App() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* Servers */}
      <div
        style={{
          width: 72,
          backgroundColor: "#1e1f22",
          padding: 8,
        }}
      >
        <div style={{ marginBottom: 8 }}>🟣</div>
        <div style={{ marginBottom: 8 }}>🟣</div>
        <div style={{ marginBottom: 8 }}>🟣</div>
      </div>

      {/* Channels */}
      <div
        style={{
          width: 240,
          backgroundColor: "#2b2d31",
          padding: 12,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 12 }}>
          Mon Serveur
        </div>
        <div># général</div>
        <div># vidéos</div>
      </div>

      {/* Chat */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#313338",
          padding: 16,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 12 }}>
          # général
        </div>
        <div>Bienvenue sur le clone Discord 👋</div>
      </div>
    </div>
  );
}

export default App;
