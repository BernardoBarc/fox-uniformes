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
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch("http://localhost:5000/auth/verify", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        setIsAuthenticated(true);
        router.push("/dashboard");
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
    }
  };
  
  useEffect(() => {
    isAuthenticatedUser();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <header className="mb-8">
        <img src="/next.svg" alt="Logo" className="h-12" />
      </header>
      <h1 className="text-4xl font-bold">Login Page</h1>
        <form className="flex flex-col gap-4 w-1/3">
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
        <p className="justify-center">
          Não tem uma conta?{" "}
          <a href="/register" className="text-blue-500 hover:underline">
            Registre-se aqui
          </a>
        </p>
        <p className="mt-4 justify-center">
          <a href="/Esqueci-minha-senha" className="text-blue-500 hover:underline">
            Esqueci minha senha
          </a>
        </p>
    </main>
  );
}
