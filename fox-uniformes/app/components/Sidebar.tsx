"use client";
import React from 'react';
import Button from './Button';

// Aceita TabType ou string para compatibilidade com páginas que usam tipos diferentes
export default function Sidebar({ active, onChange, items }: { active: string, onChange: (t: string | any) => void, items?: { key: string; label: string }[] }) {
  const defaultItems = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'pedidos', label: '📦 Pedidos' },
    { key: 'vendedores', label: '👥 Vendedores' },
    { key: 'produtos', label: '🛍️ Produtos' },
    { key: 'clientes', label: '👤 Clientes' },
    { key: 'trajetos', label: '🗺️ Trajetos' },
    { key: 'cupons', label: '🏷️ Cupons' },
    { key: 'categorias', label: '📚 Categorias' },
  ];
  const menuItems = items && items.length ? items : defaultItems;

  return (
    <aside className="w-full sm:w-64 lg:w-72 bg-transparent border-r border-white/6 p-4 h-full">
      <nav className="flex sm:flex-col gap-2 sm:gap-4">
        {menuItems.map(i => (
          <Button
            key={i.key}
            onClick={() => onChange(i.key)}
            variant="ghost"
            className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${active === i.key ? 'bg-gradient-to-r from-[#b38b34]/20 to-[#d4af37]/10 text-white' : 'hover:bg-white/3 text-gray-200'}`}
          >
            <span className="text-sm">{i.label}</span>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
