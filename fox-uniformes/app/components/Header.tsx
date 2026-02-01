"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Button from "./Button";
import { API_URL } from "../config/api";

export default function Header({ user, onLogout }: { user?: { login?: string; name?: string }, onLogout?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  // Esconder Header na página de acompanhamento, na root (login) e em Esqueci-senha
  if (pathname && (pathname === '/' || pathname.startsWith('/acompanhar') || pathname === '/Esqueci-senha')) return null;
  const [fetchedUser, setFetchedUser] = useState<{ login?: string; name?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify`, { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) setFetchedUser(data.user);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const displayName = user?.name || user?.login || fetchedUser?.name || fetchedUser?.login || null;

  return (
    <header className="w-full bg-transparent backdrop-blur-sm border-b border-white/6 py-4">
      <div className="container-responsive flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* trocar o avatar de letra por imagem da logo (tenta /logoAmarelo.png, depois fallback para /logoBranco.png) */}
          <img
            src="/logoAmarelo.png"
            alt="Fox Uniformes"
            className="w-10 h-10 rounded-full object-cover"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              const img = e.currentTarget as HTMLImageElement;
              // evita tentar trocar a mesma imagem em loop
              if (!img.getAttribute('data-fallback')) {
                img.setAttribute('data-fallback', '1');
                img.src = '/logoBranco.png';
              }
            }}
          />
          <div>
            <div className="text-lg font-semibold">Fox Uniformes</div>
            <div className="text-xs kv-muted">Painel Administrativo</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {displayName && <div className="text-sm kv-muted hidden sm:block">Olá, <span className="kv-accent font-medium">{displayName}</span></div>}
          <Button
            onClick={() => { if (onLogout) onLogout(); else { localStorage.removeItem('token'); router.push('/'); }}}
            variant="primary"
            className="px-3 py-2 text-sm"
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
