function App() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#1e1f22",
        color: "white",
      }}
    >
      {/* Servers */}
      <div style={{ width: 72, backgroundColor: "#1e1f22" }}>
        SERVERS
      </div>

      {/* Channels */}
      <div style={{ width: 240, backgroundColor: "#2b2d31" }}>
        CHANNELS
      </div>

      {/* Chat */}
      <div style={{ flex: 1, backgroundColor: "#313338" }}>
        CHAT
      </div>
    </div>
  );
}

export default App;
