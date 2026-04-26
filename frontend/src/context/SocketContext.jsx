import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000", {
      transports: ["websocket"],
    });

    socketRef.current.emit("join", user._id || user.id);

    socketRef.current.on("notification", (data) => {
      setNotifications((prev) => [{ ...data, id: Date.now(), read: false }, ...prev]);

      // Show toast based on type
      const icons = {
        new_job: "💼",
        new_application: "📩",
        status_update: "📋",
        interview_scheduled: "🎯",
        interview_cancelled: "❌",
        account_approved: "✅",
      };
      toast(`${icons[data.type] || "🔔"} ${data.message}`);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
