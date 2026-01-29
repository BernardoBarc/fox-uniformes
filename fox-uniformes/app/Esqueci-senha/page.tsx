"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../config/api";
import Button from "../components/Button";
// não renderizar o Header aqui para evitar o texto 'Painel Administrativo'
// Header removido nesta página para centralizar o formulário

const EsqueciSenha: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/esqueci-senha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Email de recuperação enviado com sucesso!");
        setEmail("");
      } else {
        setError(data.error || "Erro ao enviar email de recuperação");
      }
    } catch (error) {
      console.error("Erro ao enviar email de recuperação:", error);
      setError("Erro ao conectar com o servidor");
    }
  };
  return (
    <main className="min-h-screen bg-app text-app flex items-center justify-center p-6">
      {/* Header removido para esta página */}
      <div className="container-responsive w-full max-w-lg">
        <div className="login-card mx-auto">
          <div className="flex flex-col items-center mb-4">
            {/* usar logo amarela em vez do 'F' */}
            <div className="w-28 h-28 flex items-center justify-center bg-transparent">
              <img
                src="/logoAmarelo.png"
                alt="Logo Fox"
                className="w-24 h-24 object-contain"
              />
            </div>
            <div className="text-sm kv-muted mt-2">Recuperação de senha</div>
          </div>

          <p className="text-center kv-muted mb-4">
            Insira o email cadastrado para receber instruções de recuperação.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-gold"
            />
            <Button type="submit" variant="gold" className="w-full">
              Enviar
            </Button>
            {message && (
              <p className="text-success text-sm text-center mt-2">{message}</p>
            )}
            {error && (
              <p className="text-red-400 text-sm text-center mt-2">{error}</p>
            )}
          </form>

          <div className="mt-4 text-center">
            <a
              href="/"
              className="text-sm kv-muted hover:underline"
            >
              ← Voltar ao login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default EsqueciSenha;
