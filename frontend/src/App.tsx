import React, { useEffect, useState } from "react";
import { OpeningView } from "./routes/OpeningView";
import { OperatorCell } from "./routes/OperatorCell";
import { NodeView } from "./routes/NodeView";

export const App: React.FC = () => {
  const [room, setRoom] = useState<string | null>(null);
  const [role, setRole] = useState<"operator" | "node">("operator");
  const [isReplay, setIsReplay] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    const roleParam = params.get("role");

    if (roomParam) {
      setRoom(roomParam);
      if (roleParam === "node") {
        setRole("node");
      } else {
        setRole("operator");
      }
    }
  }, []);

  const handleStartRoom = (roomId: string, replay: boolean) => {
    setRoom(roomId);
    setRole("operator");
    setIsReplay(replay);
    window.history.pushState({}, "", `?room=${roomId}&role=operator`);
  };

  if (!room) {
    return <OpeningView onStartRoom={handleStartRoom} />;
  }

  if (role === "node") {
    return <NodeView roomCode={room} />;
  }

  return <OperatorCell roomCode={room} initialReplay={isReplay} />;
};
