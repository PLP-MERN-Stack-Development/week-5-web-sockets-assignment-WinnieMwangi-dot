import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001/chat", {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

function App() {
  const [username, setUsername] = useState("");
  const [tempName, setTempName] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [page, setPage] = useState(1);
  const bottomRef = useRef(null);

  // Join
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
      scrollToBottom();
    });

    socket.on("older_messages", (older) => {
      setChat((prev) => [...older, ...prev]);
    });

    socket.on("search_results", (results) => {
      setSearchResults(results);
    });

    return () => {
      socket.off("receive_message");
      socket.off("older_messages");
      socket.off("search_results");
    };
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogin = () => {
    if (tempName.trim()) {
      setUsername(tempName);
      socket.emit("join", tempName);
    }
  };

  const sendMessage = () => {
    if (message.trim() === "") return;

    const data = {
      user: username,
      message,
      time: new Date().toLocaleTimeString()
    };

    socket.emit("send_message", data, (status) => {
      if (status === "delivered") {
        console.log("✅ Message delivered.");
      } else {
        console.log("❌ Delivery failed.");
      }
    });

    setMessage("");
  };

  const loadOlder = () => {
    socket.emit("load_older", { page });
    setPage((p) => p + 1);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      socket.emit("search_messages", searchTerm);
    }
  };

  if (!username) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Enter your username</h2>
        <input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          placeholder="Your name"
        />
        <button onClick={handleLogin}>Join Chat</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome, {username} 👋</h1>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search messages"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div style={{ background: "#fef3c7", padding: "10px", marginTop: "10px" }}>
          <h4>Search Results:</h4>
          {searchResults.map((msg, idx) => (
            <div key={idx}>
              <strong>{msg.time} - {msg.user}</strong>: {msg.message}
            </div>
          ))}
        </div>
      )}

      {/* Load Older Messages */}
      <button onClick={loadOlder} style={{ margin: "10px 0" }}>
        Load Older Messages
      </button>

      {/* Chat */}
      <div style={{ border: "1px solid gray", height: "250px", overflowY: "scroll", padding: "10px", backgroundColor: "#f4f4f4" }}>
        {chat.map((msg, index) => (
          <div key={index}>
            <strong>{msg.time} - {msg.user}:</strong> {msg.message}
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      {/* Send Message */}
      <div style={{ marginTop: "10px" }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
