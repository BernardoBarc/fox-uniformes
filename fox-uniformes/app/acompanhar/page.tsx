"use client";
import React, { useState } from "react";
import Link from "next/link";
import { API_URL } from "../config/api";
import Button from "../components/Button";

interface Produto {
  _id: string;
  name: string;
  preco: number;
  categoria: string;
  tamanho: string;
}

interface Pedido {
  _id: string;
  nomeCliente: string;
  produtoId: Produto;
  quantidade: number;
  status: string;
  preco: number;
  entrega: string;
  observacoes?: string;
  createdAt: string;
}

interface Cliente {
  _id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
}

export default function AcompanharPedidosPage() {
  const [cpf, setCpf] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  // Formatar CPF enquanto digita
  const formatarCPF = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  };

  // Buscar pedidos por CPF
  const buscarPedidos = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      setError("Digite um CPF válido com 11 dígitos");
      return;
    }

    setLoading(true);
    setError(null);
    setBuscaRealizada(true);

    try {
      // Primeiro buscar o cliente pelo CPF
      const clienteResponse = await fetch(`${API_URL}/clientes/cpf/${cpfLimpo}`);
      
      if (!clienteResponse.ok) {
        setError("Nenhum cadastro encontrado com este CPF");
        setCliente(null);
        setPedidos([]);
        setLoading(false);
        return;
      }

      const clienteData = await clienteResponse.json();
      setCliente(clienteData);

      // Buscar pedidos do cliente
      const pedidosResponse = await fetch(`${API_URL}/pedidos/cliente/${clienteData._id}`);
      
      if (pedidosResponse.ok) {
        const pedidosData = await pedidosResponse.json();
        // Ordenar por data mais recente
        const pedidosOrdenados = pedidosData.sort((a: Pedido, b: Pedido) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPedidos(pedidosOrdenados);
      } else {
        setPedidos([]);
      }
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
      setError("Erro ao conectar com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Cores do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendente":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "Aguardando Pagamento":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Em Progresso":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Em Trânsito":
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      case "Concluído":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Cancelado":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // Ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pendente":
        return "⏳";
      case "Aguardando Pagamento":
        return "💳";
      case "Em Progresso":
        return "🔨";
      case "Em Trânsito":
        return "🚚";
      case "Concluído":
        return "✅";
      case "Cancelado":
        return "❌";
      default:
        return "📦";
    }
  };

  // Descrição do status para o cliente
  const getStatusDescricao = (status: string) => {
    switch (status) {
      case "Pendente":
        return "Seu pedido está aguardando processamento";
      case "Aguardando Pagamento":
        return "Aguardando confirmação do pagamento";
      case "Em Progresso":
        return "Seu pedido está sendo produzido";
      case "Em Trânsito":
        return "Seu pedido está a caminho! 🚚";
      case "Concluído":
        return "Pedido entregue com sucesso!";
      case "Cancelado":
        return "Este pedido foi cancelado";
      default:
        return "Status do pedido";
    }
  };

  // Timeline do pedido
  const getTimeline = (status: string) => {
    const etapas = [
      { nome: "Aguardando Pagamento", icon: "💳" },
      { nome: "Em Progresso", icon: "🔨" },
      { nome: "Em Trânsito", icon: "🚚" },
      { nome: "Concluído", icon: "✅" },
    ];

    const statusIndex = etapas.findIndex(e => e.nome === status);
    
    return etapas.map((etapa, index) => {
      let estado = "pendente";
      if (status === "Cancelado") {
        estado = "cancelado";
      } else if (index < statusIndex) {
        estado = "completo";
      } else if (index === statusIndex) {
        estado = "atual";
      }
      return { ...etapa, estado };
    });
  };

  // Limpar busca
  const limparBusca = () => {
    setCpf("");
    setCliente(null);
    setPedidos([]);
    setError(null);
    setBuscaRealizada(false);
  };

  return (
    <div className="min-h-screen bg-app text-app">
      {/* Cabeçalho simplificado: ícone + nome centralizados (remove duplicação) */}
      <header className="w-full py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
          <img src="/logoAmarelo.png" alt="Fox Uniformes" className="h-12 w-auto" />
          <span className="text-2xl sm:text-3xl font-semibold kv-accent">Fox Uniformes</span>
        </div>
      </header>

      <main className="container-responsive max-w-4xl mx-auto px-4 py-8">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold kv-accent mb-2">
            📦 Acompanhe seus Pedidos
          </h1>
          <p className="kv-muted">
            Digite seu CPF para consultar o status dos seus pedidos
          </p>
        </div>

        {/* Formulário de Busca */}
        <div className="bg-card rounded-2xl p-6 mb-8">
          <form onSubmit={buscarPedidos} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm kv-muted mb-2">
                Digite seu CPF
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatarCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full bg-card rounded-xl px-4 py-3 text-app text-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:kv-muted"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="submit"
                disabled={loading || cpf.replace(/\D/g, "").length !== 11}
                variant="gold"
                className="px-6 py-3 rounded-xl font-semibold text-black flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                    Buscando...
                  </>
                ) : (
                  <>🔍 Buscar</>
                )}
              </Button>
              {buscaRealizada && (
                <Button
                  type="button"
                  onClick={limparBusca}
                  variant="ghost"
                  className="px-4 py-3 rounded-xl font-semibold"
                >
                  ✕
                </Button>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Dados do Cliente */}
        {cliente && (
          <div className="bg-card rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold kv-accent mb-4 flex items-center gap-2">
              👤 Olá, {cliente.nome.split(" ")[0]}!
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="kv-muted"><span className="text-sm kv-muted">CPF:</span> {cliente.cpf}</div>
              <div className="kv-muted"><span className="text-sm kv-muted">Telefone:</span> {cliente.telefone}</div>
              {cliente.email && <div className="kv-muted"><span className="text-sm kv-muted">Email:</span> {cliente.email}</div>}
              <div className="kv-muted"><span className="text-sm kv-muted">Cidade:</span> {cliente.cidade} - {cliente.estado}</div>
            </div>
          </div>
        )}

        {/* Lista de Pedidos */}
        {buscaRealizada && cliente && (
          <div>
            <h2 className="text-xl font-semibold kv-accent mb-4 flex items-center gap-2">
              📋 Seus Pedidos ({pedidos.length})
            </h2>

            {pedidos.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="kv-muted text-lg">
                  Nenhum pedido encontrado para este CPF
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pedidos.map((pedido) => (
                  <div key={pedido._id} className="bg-card rounded-2xl p-6 border border-white/6 hover:border-white/12 transition">
                    {/* Cabeçalho do Pedido */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-app flex items-center gap-2">
                          {pedido.produtoId?.name || "Produto"}
                          {pedido.produtoId?.tamanho && (
                            <span className="text-sm badge-gold">{pedido.produtoId.tamanho}</span>
                          )}
                        </h3>
                        <p className="text-sm kv-muted">
                          Pedido em {new Date(pedido.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-full border text-sm font-medium ${getStatusColor(pedido.status)}`}>
                        {getStatusIcon(pedido.status)} {pedido.status}
                      </div>
                    </div>

                    {/* Timeline do Status */}
                    {pedido.status !== "Cancelado" && pedido.status !== "Pendente" && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between relative">
                          {/* Linha de conexão */}
                          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-700"></div>
                          
                          {getTimeline(pedido.status).map((etapa, index) => (
                            <div key={index} className="flex flex-col items-center relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                                ${etapa.estado === "completo" ? "bg-green-500" : 
                                  etapa.estado === "atual" ? "bg-orange-500 animate-pulse" : 
                                  "bg-gray-700"}`}
                              >
                                {etapa.estado === "completo" ? "✓" : etapa.icon}
                              </div>
                              <span className={`text-xs mt-1 ${
                                etapa.estado === "atual" ? "text-orange-400 font-medium" : 
                                etapa.estado === "completo" ? "text-green-400" : 
                                "text-gray-500"
                              }`}>
                                {etapa.nome.split(" ")[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Descrição do Status */}
                    <div className="bg-gray-700/50 rounded-xl p-3 mb-4">
                      <p className="text-sm text-gray-300">
                        {getStatusDescricao(pedido.status)}
                      </p>
                    </div>

                    {/* Detalhes do Pedido */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Quantidade</p>
                        <p className="text-white font-medium">{pedido.quantidade}x</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Valor</p>
                        <p className="text-green-400 font-medium">R$ {pedido.preco?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entrega</p>
                        <p className="text-white font-medium">
                          {new Date(pedido.entrega).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      {pedido.produtoId?.categoria && (
                        <div>
                          <p className="text-gray-500">Categoria</p>
                          <p className="text-white font-medium">{pedido.produtoId.categoria}</p>
                        </div>
                      )}
                    </div>

                    {/* Observações */}
                    {pedido.observacoes && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-500">📝 Observações:</p>
                        <p className="text-sm text-gray-300">{pedido.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mensagem inicial */}
        {!buscaRealizada && (
          <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Consulte seus pedidos
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Digite o CPF utilizado no cadastro para visualizar todos os seus pedidos 
              e acompanhar o status de cada um em tempo real.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
