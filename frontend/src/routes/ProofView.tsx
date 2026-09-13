import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileWarning, Link2 } from "lucide-react";
import { sha256Hex } from "../proof/integrity";
import { apiUrl } from "../backend";

interface Props { runId: string; }
interface ProofArtifact {
  run_id: string; room_id: string; created_at: string; source: "REPLAY_FIXTURE" | "LIVE_MIC";
  seed: number; outcome: "RECOVERED" | "UNRESOLVED"; off_exposure_ms: number;
  on_exposure_ms: number; reduction_db: number | null; previous_digest: string | null; digest: string;
}

export const ProofView: React.FC<Props> = ({ runId }) => {
  const [proof, setProof] = useState<ProofArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [integrityValid, setIntegrityValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = window.localStorage.getItem("cuthush-latest-proof");
        const local = raw ? JSON.parse(raw) as ProofArtifact : null;
        if (local && (runId === "latest" || local.run_id === runId)) {
          if (!cancelled) {
            setProof(local);
            const { digest, ...unsigned } = local;
            setIntegrityValid(await sha256Hex(unsigned) === digest);
          }
          return;
        }
        if (runId !== "latest") {
          const response = await fetch(apiUrl(`/api/proofs/${encodeURIComponent(runId)}`));
          if (response.ok && !cancelled) {
            const artifact = await response.json() as ProofArtifact;
            const { digest, ...unsigned } = artifact;
            setProof(artifact);
            setIntegrityValid(await sha256Hex(unsigned) === digest);
          }
        }
      } catch {
        if (!cancelled) setProof(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [runId]);

  return <main className="editorial-page proof-page">
    <a href="/" className="back-link"><ArrowLeft size={14} /> CutHush</a>
    <p className="eyebrow">RUN PROOF / {runId}</p>
    <h1>Same incident. Different outcome.</h1>
    {loading ? <section className="boundary-panel"><p>Loading measured evidence…</p></section> : !proof ? <section className="boundary-panel"><FileWarning className="text-amber" /><h2>No completed proof found</h2><p>Run Judge Mode from the Test Cell first. CutHush will not prefill or invent a successful result.</p></section> : <>
      <section className="proof-columns large-proof"><div className="proof-column"><span>GOVERNOR OFF</span><strong>{proof.off_exposure_ms} ms</strong><small>instability exposure · seed #{proof.seed}</small></div><div className={`proof-column ${proof.outcome === "RECOVERED" ? "is-recovered" : ""}`}><span>GOVERNOR ON</span><strong>{proof.outcome}</strong><small>{proof.reduction_db === null ? "recovery not measured" : `${proof.reduction_db.toFixed(1)} dB reduction · ${proof.on_exposure_ms} ms exposure`}</small></div></section>
      <section className="proof-verdict"><CheckCircle2 className={proof.outcome === "RECOVERED" ? "text-green" : "text-amber"} /><div><span>INCIDENT IDENTITY</span><strong>SEED #{proof.seed} / {proof.source}</strong><small>{new Date(proof.created_at).toLocaleString()} · room {proof.room_id}</small></div></section>
      <section className={`integrity-strip ${integrityValid ? "is-valid" : "is-invalid"}`}><Link2 size={15} /><div><span>SHA-256 EVIDENCE HEAD · {integrityValid ? "VERIFIED" : "MISMATCH"}</span><code>{proof.digest}</code><small>{proof.previous_digest ? `chains to ${proof.previous_digest.slice(0, 16)}…` : "first proof in this device chain"}</small></div></section>
    </>}
    <a href="/?page=methodology" className="btn btn-secondary btn-md">Read methodology</a>
  </main>;
};
