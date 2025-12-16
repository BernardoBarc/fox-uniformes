"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      const response = await fetch("http://localhost:5000/auth/verify", {
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
      const response = await fetch("http://localhost:5000/users/login", {
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
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <header className="mb-8">
        <img src="/next.svg" alt="Logo" className="h-12" />
      </header>
      <h1 className="text-4xl font-bold">Login Page</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-1/3">
          <input
            type="text"
            placeholder="Login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </form>
        <p className="mt-4 justify-center">
          <a href="/Esqueci-senha" className="text-blue-500 hover:underline">
            Esqueci minha senha
          </a>
        </p>
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-600 mb-2">É cliente? Acompanhe seus pedidos:</p>
          <a 
            href="/acompanhar" 
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
          >
            📦 Acompanhar Pedidos
          </a>
        </div>
    </main>
  );
}
