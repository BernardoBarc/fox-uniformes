"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../config/api";

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
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <header className="mb-8">
        <img src="/next.svg" alt="logoPreto.png" className="h-12" />
      </header>
      <p className="text-4xl font-bold">Esqueci minha senha</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-1/3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Enviar
        </button>
        {message && <p className="text-green-500">{message}</p>}
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </main>
  );
};

export default EsqueciSenha;
