import React, { useEffect, useState } from "react";
import { OpeningView } from "./routes/OpeningView";
import { OperatorCell } from "./routes/OperatorCell";
import { NodeView } from "./routes/NodeView";
import { MethodologyView } from "./routes/MethodologyView";
import { ProofView } from "./routes/ProofView";
import { warmBackend } from "./backend";

export const App: React.FC = () => {
  const [room, setRoom] = useState<string | null>(null);
  const [role, setRole] = useState<"operator" | "node">("operator");
  const [isReplay, setIsReplay] = useState(false);
  const [page, setPage] = useState<"opening" | "cell" | "node" | "proof" | "methodology">("opening");

  useEffect(() => {
    warmBackend();
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    const roleParam = params.get("role");
    const proofParam = params.get("proof");
    const pageParam = params.get("page");
    const parts = window.location.pathname.split("/").filter(Boolean);

    if (pageParam === "methodology") { setPage("methodology"); return; }
    if (proofParam) { setRoom(proofParam); setPage("proof"); return; }
    if (parts[0] === "methodology") { setPage("methodology"); return; }
    if (parts[0] === "proof") { setRoom(parts[1] || "latest"); setPage("proof"); return; }
    if (parts[0] === "node" && parts[1]) { setRoom(parts[1]); setRole("node"); setPage("node"); return; }
    if ((parts[0] === "cell" || parts[0] === "pair") && parts[1]) {
      setRoom(parts[1]); setRole("operator"); setIsReplay(params.get("source") === "replay"); setPage("cell"); return;
    }

    if (roomParam) {
      setRoom(roomParam);
      setIsReplay(params.get("source") === "replay");
      if (roleParam === "node") {
        setRole("node");
        setPage("node");
      } else {
        setRole("operator");
        setPage("cell");
      }
    }
  }, []);

  const handleStartRoom = (roomId: string, replay: boolean) => {
    setRoom(roomId);
    setRole("operator");
    setIsReplay(replay);
    setPage("cell");
    window.history.pushState({}, "", `/?room=${encodeURIComponent(roomId)}${replay ? "&source=replay" : ""}`);
  };

  if (page === "methodology") return <MethodologyView />;
  if (page === "proof") return <ProofView runId={room ?? "latest"} />;

  if (!room) {
    return <OpeningView onStartRoom={handleStartRoom} />;
  }

  if (page === "node" || role === "node") {
    return <NodeView roomCode={room} />;
  }

  return <OperatorCell roomCode={room} initialReplay={isReplay} />;
};
