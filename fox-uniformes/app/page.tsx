"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "./config/api";
import Button from "./components/Button";

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
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="decoration-wrap" aria-hidden>
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="container-responsive hero-grid">
        <div className="flex flex-col gap-6">
          <div className="kv-accent text-4xl font-extrabold">Fox Uniformes</div>
          <p className="kv-muted max-w-lg">Painel administrativo seguro para gerenciar pedidos, clientes e rotas. Acesse suas cobranças e notas de forma rápida.</p>

          <div className="mt-6 flex gap-3">
            {/* botões removidos conforme solicitado */}
          </div>
        </div>

        <div className="login-card" role="region" aria-label="Formulário de login">
          <div className="flex flex-col items-center mb-4">
            <img src="/logoAmarelo.png" alt="Fox Uniformes" className="w-16 h-16 rounded-full object-cover" onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { const img = e.currentTarget as HTMLImageElement; if (!img.getAttribute('data-fallback')) { img.setAttribute('data-fallback', '1'); img.src = '/logoBranco.png'; } }} />
            <div className="text-sm kv-muted mt-2">Painel Administrativo</div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
            <input
              type="text"
              placeholder="Login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="input-gold"
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-gold"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={isAuthenticated}
            >
              Entrar
            </Button>
            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
          </form>

          <div className="mt-4 text-center">
            <a href="/Esqueci-senha" className="text-sm kv-muted hover:underline">Esqueci minha senha</a>
          </div>
        </div>
      </div>

    </main>
  );
}
