import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, LogOut } from "lucide-react";
import { O2Logo } from "@/components/O2Logo";
import { G4ConsolidatedDashboard } from "@/components/planning/g4/G4ConsolidatedDashboard";

// SHA-256 hash of the shared password. To change, run:
//   echo -n "nova-senha" | sha256sum
// and paste the hex here.
const PASSWORD_HASH = "54273971e36788aacc391820bd27fb3eb812cc66fae436f09ec409994cdd3402";
const STORAGE_KEY = "g4-public-unlocked";

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function PublicG4Dashboard() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const hash = await sha256Hex(password);
      if (hash === PASSWORD_HASH) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        setUnlocked(true);
      } else {
        setError("Senha incorreta.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
    setPassword("");
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="mb-8" style={{ filter: "drop-shadow(0 0 40px rgba(99,241,97,0.15))" }}>
          <O2Logo height={48} />
        </div>
        <Card className="w-full max-w-md border-primary/20 card-glow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display text-gradient">Dashboard G4</CardTitle>
            <CardDescription>Digite a senha para acessar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting || !password}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <O2Logo height={32} />
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
      <div className="p-6">
        <G4ConsolidatedDashboard />
      </div>
    </div>
  );
}
