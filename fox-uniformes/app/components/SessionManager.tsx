"use client";
import { useEffect, useRef } from "react";

export default function SessionManager() {
  const idleTimeoutMs = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MS) || 5 * 60 * 1000; // 5 minutos
  const cacheResetIntervalMs = Number(process.env.NEXT_PUBLIC_CACHE_RESET_MS) || 30 * 60 * 1000; // 30 minutos

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        // logout / timeout
        try {
          console.log("[SessionManager] timeout atingido — limpando sessão e caches");
          // Remover token (logout)
          localStorage.removeItem("token");
          // Limpar caches conhecidos por prefixo
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.startsWith("cache_") || key.startsWith("tmp_") || key.startsWith("swr:")) {
              localStorage.removeItem(key);
            }
          }
          // Limpar sessionStorage completamente
          sessionStorage.clear();
        } catch (e) {
          console.warn("[SessionManager] falha ao limpar caches:", e);
        }
        // Redireciona para homepage/login
        window.location.href = "/";
      }, idleTimeoutMs);
    };

    const activityHandler = () => {
      resetTimer();
    };

    // Eventos que consideramos atividade do usuário
    ["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach((ev) =>
      window.addEventListener(ev, activityHandler)
    );

    // Inicia timer
    resetTimer();

    // Intervalo para reset automático de cache (apenas chaves específicas)
    intervalRef.current = window.setInterval(() => {
      try {
        console.log("[SessionManager] reset automático de caches iniciado");
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.startsWith("cache_") || key.startsWith("tmp_") || key.startsWith("swr:")) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.warn("[SessionManager] falha ao resetar caches:", e);
      }
    }, cacheResetIntervalMs);

    return () => {
      // cleanup
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      ["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach((ev) =>
        window.removeEventListener(ev, activityHandler)
      );
    };
  }, [idleTimeoutMs, cacheResetIntervalMs]);

  return null;
}
