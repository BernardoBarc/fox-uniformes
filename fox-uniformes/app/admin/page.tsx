"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Tipos
interface UserData {
  id: string;
  login: string;
  role: string;
  name?: string;
}

interface Produto {
  _id: string;
  name: string;
  preco: number;
  categoria: string;
  tamanho: string;
  descricao: string;
}

interface Cliente {
  _id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  complemento: string;
  vendedorId: { _id: string; name: string; login: string };
}

interface Pedido {
  _id: string;
  nomeCliente: string;
  produtoId: Produto;
  vendedorId: { _id: string; name: string; login: string };
  quantidade: number;
  status: string;
  preco: number;
  entrega: string;
  photo?: string;
  observacoes?: string;
  createdAt: string;
}

interface Trajeto {
  _id: string;
  nomeCliente: string;
  vendedorId: { _id: string; name: string; login: string };
  cidade: string;
  estado: string;
  rua: string;
  bairro: string;
  cep: string;
  status: string;
  dataVisita: string;
  createdAt: string;
}

interface Vendedor {
  _id: string;
  name: string;
  login: string;
  email: string;
  telefone: string;
  endereco: string;
  role: string;
  createdAt: string;
}

type TabType = "dashboard" | "pedidos" | "vendedores" | "produtos" | "clientes" | "trajetos" | "novoVendedor" | "novoProduto";

const API_URL = "http://localhost:5000";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados para dados
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [trajetos, setTrajetos] = useState<Trajeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  // Estados para formulários
  const [novoVendedor, setNovoVendedor] = useState({
    name: "",
    login: "",
    email: "",
    telefone: "",
    endereco: "",
    dataNascimento: "",
    password: "",
    confirmPassword: "",
  });

  const [novoProduto, setNovoProduto] = useState({
    name: "",
    descricao: "",
    preco: 0,
    categoria: "",
    tamanho: "",
  });

  const getToken = () => localStorage.getItem("token");

  const getAuthHeaders = () => ({
    "Authorization": `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  // Função para montar URL da imagem
  const getImageUrl = (photo: string | undefined) => {
    if (!photo) return null;
    if (photo.startsWith("http")) return photo;
    return `${API_URL}${photo}`;
  };

  // Verificar autenticação e se é admin
  useEffect(() => {
    const fetchUserData = async () => {
      const token = getToken();
      if (!token) {
        router.push("/");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/auth/verify", {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          // Verificar se é admin
          if (data.user.role !== "admin") {
            router.push("/dashboard");
            return;
          }
          setUserData(data.user);
        } else {
          localStorage.removeItem("token");
          router.push("/");
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        router.push("/");
      }
    };

    fetchUserData();
  }, [router]);

  // Carregar dados quando o usuário estiver autenticado
  useEffect(() => {
    if (userData) {
      fetchAllData();
    }
  }, [userData]);

  const fetchAllData = () => {
    fetchPedidos();
    fetchTrajetos();
    fetchClientes();
    fetchProdutos();
    fetchVendedores();
  };

  // Funções para buscar dados (TODOS, não apenas do vendedor)
  const fetchPedidos = async () => {
    try {
      const response = await fetch("http://localhost:5000/pedidos", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setPedidos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    }
  };

  const fetchTrajetos = async () => {
    try {
      const response = await fetch("http://localhost:5000/trajetos", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTrajetos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar trajetos:", error);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await fetch("http://localhost:5000/clientes", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setClientes(data);
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    }
  };

  const fetchProdutos = async () => {
    try {
      const response = await fetch("http://localhost:5000/produtos", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setProdutos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  };

  const fetchVendedores = async () => {
    try {
      const response = await fetch("http://localhost:5000/users", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setVendedores(data.filter((u: Vendedor) => u.role === "vendedor"));
      }
    } catch (error) {
      console.error("Erro ao buscar vendedores:", error);
    }
  };

  // Função para atualizar status do pedido
  const handleUpdatePedidoStatus = async (pedidoId: string, novoStatus: string) => {
    try {
      const response = await fetch(`http://localhost:5000/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: novoStatus }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: `Pedido atualizado para "${novoStatus}"` });
        fetchPedidos();
      } else {
        setMessage({ type: "error", text: "Erro ao atualizar pedido" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  // Função para criar vendedor
  const handleCriarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (novoVendedor.password !== novoVendedor.confirmPassword) {
      setMessage({ type: "error", text: "As senhas não coincidem" });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/users", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: novoVendedor.name,
          login: novoVendedor.login,
          email: novoVendedor.email,
          telefone: novoVendedor.telefone,
          endereco: novoVendedor.endereco,
          dataNascimento: novoVendedor.dataNascimento,
          password: novoVendedor.password,
          role: "vendedor",
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Vendedor cadastrado com sucesso!" });
        setNovoVendedor({
          name: "",
          login: "",
          email: "",
          telefone: "",
          endereco: "",
          dataNascimento: "",
          password: "",
          confirmPassword: "",
        });
        fetchVendedores();
        setActiveTab("vendedores");
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao cadastrar vendedor" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  // Função para criar produto
  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("http://localhost:5000/produtos", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(novoProduto),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Produto cadastrado com sucesso!" });
        setNovoProduto({ name: "", descricao: "", preco: 0, categoria: "", tamanho: "" });
        fetchProdutos();
        setActiveTab("produtos");
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao cadastrar produto" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  // Função para deletar vendedor
  const handleDeletarVendedor = async (vendedorId: string) => {
    if (!confirm("Tem certeza que deseja excluir este vendedor?")) return;

    try {
      const response = await fetch(`http://localhost:5000/users/${vendedorId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Vendedor excluído com sucesso!" });
        fetchVendedores();
      } else {
        setMessage({ type: "error", text: "Erro ao excluir vendedor" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  // Função para deletar produto
  const handleDeletarProduto = async (produtoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const response = await fetch(`http://localhost:5000/produtos/${produtoId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Produto excluído com sucesso!" });
        fetchProdutos();
      } else {
        setMessage({ type: "error", text: "Erro ao excluir produto" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendente": return "bg-yellow-500";
      case "Em Progresso":
      case "Em Andamento": return "bg-blue-500";
      case "Concluído": return "bg-green-500";
      case "Cancelado": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  // Estatísticas
  const pedidosPendentes = pedidos.filter(p => p.status === "Pendente").length;
  const pedidosEmProgresso = pedidos.filter(p => p.status === "Em Progresso").length;
  const pedidosConcluidos = pedidos.filter(p => p.status === "Concluído").length;
  const faturamentoTotal = pedidos.filter(p => p.status === "Concluído").reduce((acc, p) => acc + (p.preco || 0), 0);

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-orange-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-orange-500">Fox Uniformes</h1>
            <span className="bg-orange-600 text-xs px-2 py-1 rounded-full">ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">Olá, {userData.login}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 min-h-screen p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "dashboard" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab("pedidos")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "pedidos" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              📦 Gerenciar Pedidos
              {pedidosPendentes > 0 && (
                <span className="ml-2 bg-yellow-500 text-xs px-2 py-1 rounded-full">{pedidosPendentes}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("vendedores")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "vendedores" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              👤 Vendedores
            </button>
            <button
              onClick={() => setActiveTab("novoVendedor")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novoVendedor" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              ➕ Novo Vendedor
            </button>
            <button
              onClick={() => setActiveTab("produtos")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "produtos" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              🏷️ Produtos
            </button>
            <button
              onClick={() => setActiveTab("novoProduto")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novoProduto" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              ➕ Novo Produto
            </button>
            <button
              onClick={() => setActiveTab("clientes")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "clientes" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              👥 Todos Clientes
            </button>
            <button
              onClick={() => setActiveTab("trajetos")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "trajetos" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              🗺️ Todas Rotas
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Mensagem de feedback */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${message.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
              {message.text}
            </div>
          )}

          {/* Dashboard Principal */}
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Painel Administrativo</h2>
              
              {/* Cards de Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                  <h3 className="text-lg text-gray-400">Pedidos Pendentes</h3>
                  <p className="text-4xl font-bold text-yellow-500">{pedidosPendentes}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
                  <h3 className="text-lg text-gray-400">Em Progresso</h3>
                  <p className="text-4xl font-bold text-blue-500">{pedidosEmProgresso}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                  <h3 className="text-lg text-gray-400">Concluídos</h3>
                  <p className="text-4xl font-bold text-green-500">{pedidosConcluidos}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
                  <h3 className="text-lg text-gray-400">Faturamento</h3>
                  <p className="text-3xl font-bold text-orange-500">R$ {faturamentoTotal.toFixed(2)}</p>
                </div>
              </div>

              {/* Segunda linha de estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg text-gray-400">Total de Vendedores</h3>
                  <p className="text-4xl font-bold text-purple-500">{vendedores.length}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg text-gray-400">Total de Clientes</h3>
                  <p className="text-4xl font-bold text-cyan-500">{clientes.length}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg text-gray-400">Produtos Cadastrados</h3>
                  <p className="text-4xl font-bold text-pink-500">{produtos.length}</p>
                </div>
              </div>

              {/* Pedidos Pendentes (Ação Rápida) */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">⚠️ Pedidos Aguardando Aprovação</h3>
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                  {pedidos.filter(p => p.status === "Pendente").slice(0, 5).map((pedido) => (
                    <div key={pedido._id} className="flex justify-between items-center p-4 border-b border-gray-700">
                      <div className="flex items-start gap-4">
                        {pedido.photo && (
                          <a href={getImageUrl(pedido.photo) || "#"} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={getImageUrl(pedido.photo) || ""} 
                              alt="Referência" 
                              className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition"
                            />
                          </a>
                        )}
                        <div>
                          <p className="font-semibold">{pedido.nomeCliente}</p>
                          <p className="text-sm text-gray-400">
                            {pedido.produtoId?.name || "Produto"} - Vendedor: {pedido.vendedorId?.name || "N/A"}
                          </p>
                          <p className="text-sm text-orange-400">R$ {pedido.preco?.toFixed(2)}</p>
                          {pedido.observacoes && (
                            <p className="text-xs text-blue-400 mt-1">📝 {pedido.observacoes.substring(0, 50)}...</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdatePedidoStatus(pedido._id, "Em Progresso")}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleUpdatePedidoStatus(pedido._id, "Cancelado")}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                  {pedidosPendentes === 0 && (
                    <p className="p-4 text-gray-400">✅ Nenhum pedido pendente!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gerenciar Pedidos */}
          {activeTab === "pedidos" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Gerenciar Pedidos</h2>
              <div className="bg-gray-800 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Vendedor</th>
                      <th className="px-4 py-3 text-left">Produto</th>
                      <th className="px-4 py-3 text-left">Qtd</th>
                      <th className="px-4 py-3 text-left">Preço</th>
                      <th className="px-4 py-3 text-left">Foto</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((pedido) => (
                      <tr key={pedido._id} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div>
                            <p>{pedido.nomeCliente}</p>
                            {pedido.observacoes && (
                              <p className="text-xs text-orange-400 mt-1" title={pedido.observacoes}>
                                📝 {pedido.observacoes.substring(0, 25)}...
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{pedido.vendedorId?.name || "N/A"}</td>
                        <td className="px-4 py-3">{pedido.produtoId?.name || "N/A"}</td>
                        <td className="px-4 py-3">{pedido.quantidade}</td>
                        <td className="px-4 py-3">R$ {pedido.preco?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {pedido.photo ? (
                            <a 
                              href={getImageUrl(pedido.photo) || "#"} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300"
                            >
                              📷 Ver
                            </a>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(pedido.status)}`}>
                            {pedido.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={pedido.status}
                            onChange={(e) => handleUpdatePedidoStatus(pedido._id, e.target.value)}
                            className="bg-gray-700 rounded px-2 py-1 text-sm"
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em Progresso">Em Progresso</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pedidos.length === 0 && (
                  <p className="p-4 text-gray-400 text-center">Nenhum pedido encontrado</p>
                )}
              </div>
            </div>
          )}

          {/* Lista de Vendedores */}
          {activeTab === "vendedores" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Vendedores Cadastrados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendedores.map((vendedor) => (
                  <div key={vendedor._id} className="bg-gray-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{vendedor.name}</h3>
                      <button
                        onClick={() => handleDeletarVendedor(vendedor._id)}
                        className="text-red-500 hover:text-red-400 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                    <p className="text-gray-400 text-sm">@{vendedor.login}</p>
                    <p className="text-gray-400 text-sm mt-2">📧 {vendedor.email}</p>
                    <p className="text-gray-400 text-sm">📞 {vendedor.telefone}</p>
                    <p className="text-gray-400 text-sm">📍 {vendedor.endereco}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      Cadastrado em: {new Date(vendedor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {vendedores.length === 0 && (
                  <p className="text-gray-400 col-span-3 text-center py-8">Nenhum vendedor cadastrado</p>
                )}
              </div>
            </div>
          )}

          {/* Novo Vendedor */}
          {activeTab === "novoVendedor" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Cadastrar Novo Vendedor</h2>
              <form onSubmit={handleCriarVendedor} className="bg-gray-800 p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={novoVendedor.name}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, name: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Login (usuário)</label>
                    <input
                      type="text"
                      value={novoVendedor.login}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, login: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={novoVendedor.email}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, email: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={novoVendedor.telefone}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, telefone: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={novoVendedor.dataNascimento}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, dataNascimento: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={novoVendedor.endereco}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, endereco: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Senha</label>
                    <input
                      type="password"
                      value={novoVendedor.password}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, password: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Confirmar Senha</label>
                    <input
                      type="password"
                      value={novoVendedor.confirmPassword}
                      onChange={(e) => setNovoVendedor({ ...novoVendedor, confirmPassword: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? "Cadastrando..." : "Cadastrar Vendedor"}
                </button>
              </form>
            </div>
          )}

          {/* Lista de Produtos */}
          {activeTab === "produtos" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Produtos Cadastrados</h2>
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">Categoria</th>
                      <th className="px-4 py-3 text-left">Tamanho</th>
                      <th className="px-4 py-3 text-left">Preço</th>
                      <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((produto) => (
                      <tr key={produto._id} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold">{produto.name}</p>
                            <p className="text-sm text-gray-400">{produto.descricao}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{produto.categoria}</td>
                        <td className="px-4 py-3">{produto.tamanho}</td>
                        <td className="px-4 py-3">R$ {produto.preco?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeletarProduto(produto._id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            🗑️ Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {produtos.length === 0 && (
                  <p className="p-4 text-gray-400 text-center">Nenhum produto cadastrado</p>
                )}
              </div>
            </div>
          )}

          {/* Novo Produto */}
          {activeTab === "novoProduto" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Cadastrar Novo Produto</h2>
              <form onSubmit={handleCriarProduto} className="bg-gray-800 p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Nome do Produto</label>
                    <input
                      type="text"
                      value={novoProduto.name}
                      onChange={(e) => setNovoProduto({ ...novoProduto, name: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                    <textarea
                      value={novoProduto.descricao}
                      onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                    <select
                      value={novoProduto.categoria}
                      onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="Polo">Polo</option>
                      <option value="Camiseta">Camiseta</option>
                      <option value="Calça">Calça</option>
                      <option value="Moletom">Moletom</option>
                      <option value="Jaqueta">Jaqueta</option>
                      <option value="Boné">Boné</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tamanho</label>
                    <select
                      value={novoProduto.tamanho}
                      onChange={(e) => setNovoProduto({ ...novoProduto, tamanho: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="PP">PP</option>
                      <option value="P">P</option>
                      <option value="M">M</option>
                      <option value="G">G</option>
                      <option value="GG">GG</option>
                      <option value="XG">XG</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={novoProduto.preco}
                      onChange={(e) => setNovoProduto({ ...novoProduto, preco: parseFloat(e.target.value) })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? "Cadastrando..." : "Cadastrar Produto"}
                </button>
              </form>
            </div>
          )}

          {/* Lista de Todos os Clientes */}
          {activeTab === "clientes" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Todos os Clientes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientes.map((cliente) => (
                  <div key={cliente._id} className="bg-gray-800 p-4 rounded-xl">
                    <h3 className="font-semibold text-lg mb-2">{cliente.nome}</h3>
                    <p className="text-gray-400 text-sm">📞 {cliente.telefone}</p>
                    {cliente.email && <p className="text-gray-400 text-sm">✉️ {cliente.email}</p>}
                    <p className="text-gray-400 text-sm mt-2">
                      📍 {cliente.rua}, {cliente.numero} - {cliente.bairro}
                    </p>
                    <p className="text-gray-400 text-sm">{cliente.cidade} - {cliente.estado}</p>
                    <p className="text-orange-400 text-xs mt-2">
                      Vendedor: {cliente.vendedorId?.name || "N/A"}
                    </p>
                  </div>
                ))}
                {clientes.length === 0 && (
                  <p className="text-gray-400 col-span-3 text-center py-8">Nenhum cliente cadastrado</p>
                )}
              </div>
            </div>
          )}

          {/* Lista de Todas as Rotas */}
          {activeTab === "trajetos" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Todas as Rotas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trajetos.map((trajeto) => (
                  <div key={trajeto._id} className="bg-gray-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{trajeto.nomeCliente}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(trajeto.status)}`}>
                        {trajeto.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{trajeto.rua}, {trajeto.bairro}</p>
                    <p className="text-gray-400 text-sm">{trajeto.cidade} - {trajeto.estado}</p>
                    <p className="text-gray-400 text-sm">CEP: {trajeto.cep}</p>
                    {trajeto.dataVisita && (
                      <p className="text-blue-400 text-sm mt-2">
                        Visita: {new Date(trajeto.dataVisita).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-orange-400 text-xs mt-2">
                      Vendedor: {trajeto.vendedorId?.name || "N/A"}
                    </p>
                  </div>
                ))}
                {trajetos.length === 0 && (
                  <p className="text-gray-400 col-span-3 text-center py-8">Nenhuma rota cadastrada</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
