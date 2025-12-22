"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "./config/api";

export default function loginPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const isAuthenticatedUser = async () => {
    const token = localStorage.getItem("token");
    
    // Se não tem token, não precisa verificar
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        // Redirecionar baseado no role
        if (data.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        // Token inválido, remove do localStorage
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Servidor offline ou erro de rede - não bloqueia o usuário
      console.error("Error checking authentication:", error);
      setIsAuthenticated(false);
    }
  };
  
  useEffect(() => {
    isAuthenticatedUser();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        // Redirecionar baseado no role
        if (data.user && data.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(data.error || "Erro ao fazer login");
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      setError("Erro ao conectar com o servidor");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground transition-colors duration-300">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 flex flex-col items-center gap-8">
        <img src="/logoPreto.png" alt="Logo" className="h-14 mb-2 dark:hidden" />
        <img src="/logoBranco.png" alt="Logo" className="h-14 mb-2 hidden dark:block" />
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
          <input
            type="text"
            placeholder="Login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            autoComplete="current-password"
          />
          <button
            type="submit"
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold p-3 rounded-lg hover:opacity-90 transition-colors"
            disabled={isAuthenticated}
          >
            Entrar
          </button>
          {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
        </form>
        <a href="/Esqueci-senha" className="text-blue-500 dark:text-blue-400 hover:underline text-sm mt-2">Esqueci minha senha</a>
      </div>
    </main>
  );
}
