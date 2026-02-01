"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "../../../config/api";
import Button from "../../../components/Button";

const ResetSenha: React.FC = () => {
  const params = useParams();
  const token = (params as any)?.token as string | undefined;

  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!senha || senha.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres");
      return;
    }

    if (senha !== confirmSenha) {
      setError("As senhas não coincidem");
      return;
    }

    if (!token) {
      setError("Token inválido ou ausente");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Erro ao redefinir senha");
      } else {
        setMessage("Senha atualizada com sucesso. Você já pode fazer login.");
        setSenha("");
        setConfirmSenha("");
      }
    } catch (err) {
      console.error("Erro ao resetar senha:", err);
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-app text-app flex items-center justify-center p-6">
      <div className="container-responsive w-full max-w-lg">
        <div className="login-card mx-auto">
          <div className="flex flex-col items-center mb-4">
            <div className="w-28 h-28 flex items-center justify-center bg-transparent">
              <img src="/logoAmarelo.png" alt="Logo Fox" className="w-24 h-24 object-contain" />
            </div>
            <div className="text-sm kv-muted mt-2">Redefinir senha</div>
          </div>

          <p className="text-center kv-muted mb-4">
            Insira a nova senha e confirme para finalizar a recuperação.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <input
              type="password"
              placeholder="Nova senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input-gold"
            />

            <input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmSenha}
              onChange={(e) => setConfirmSenha(e.target.value)}
              className="input-gold"
            />

            {message && <p className="text-success text-sm text-center mt-2">{message}</p>}
            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}

            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Redefinir senha"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <a href="/" className="text-sm kv-muted hover:underline">← Voltar ao login</a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ResetSenha;
