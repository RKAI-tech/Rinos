export default function App() {
  return (
    <div style={{ 
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      padding: "20px",
      backgroundColor: "#f5f5f5",
      minHeight: "100vh"
    }}>
      <h1 style={{ color: "#333", marginBottom: "20px" }}>
        🎥 Rikkei Automation - Recorder
      </h1>
      <div style={{ 
        backgroundColor: "white", 
        padding: "20px", 
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <p style={{ marginBottom: "15px" }}>
          Cửa sổ recorder để ghi lại các thao tác automation.
        </p>
        <p style={{ marginBottom: "15px" }}>
          Dev server: <code>{import.meta.env.VITE_DEV_SERVER_URL ?? "(chưa cấu hình)"}</code>
        </p>
        <button 
          style={{
            backgroundColor: "#007acc",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            cursor: "pointer"
          }}
          onClick={() => alert("Recorder đã sẵn sàng!")}
        >
          Bắt đầu ghi
        </button>
      </div>
    </div>
  );
}
