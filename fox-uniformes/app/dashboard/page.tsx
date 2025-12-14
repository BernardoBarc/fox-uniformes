"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Tipos
interface UserData {
  id: string;
  login: string;
  role: string;
}

interface Produto {
  _id: string;
  name: string;
  preco: number;
  categoria: string;
  tamanho: string;
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
}

interface Pedido {
  _id: string;
  nomeCliente: string;
  produtoId: Produto;
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
  cidade: string;
  estado: string;
  rua: string;
  bairro: string;
  cep: string;
  status: string;
  dataVisita: string;
  createdAt: string;
}

type TabType = "dashboard" | "pedidos" | "trajetos" | "clientes" | "novoPedido" | "novoTrajeto" | "novoCliente";

const API_URL = "http://localhost:5000";

export default function DashboardPage() {
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

  // Interface para item do carrinho
  interface ItemCarrinho {
    id: string;
    produtoId: string;
    produtoNome: string;
    categoria: string;
    tamanho: string;
    quantidade: number;
    precoUnitario: number;
    precoTotal: number;
    observacoes: string;
    foto?: File;
    previewFoto?: string;
  }

  // Estados para formulários
  const [novoPedido, setNovoPedido] = useState({
    nomeCliente: "",
    entrega: "",
  });
  
  // Estados do carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [itemAtual, setItemAtual] = useState({
    categoria: "",
    produtoId: "",
    quantidade: 1,
    observacoes: "",
  });
  const [fotoItemAtual, setFotoItemAtual] = useState<File | null>(null);
  const [previewFotoAtual, setPreviewFotoAtual] = useState<string | null>(null);

  // Produtos filtrados por categoria
  const produtosFiltrados = itemAtual.categoria 
    ? produtos.filter(p => p.categoria === itemAtual.categoria)
    : [];

  // Lista de categorias únicas
  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  // Total do carrinho
  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.precoTotal, 0);

  const [novoTrajeto, setNovoTrajeto] = useState({
    nomeCliente: "",
    cidade: "",
    estado: "",
    rua: "",
    bairro: "",
    cep: "",
    complemento: "",
    pontoReferencia: "",
    dataVisita: "",
  });

  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    rua: "",
    numero: "",
    bairro: "",
    cep: "",
    complemento: "",
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

  // Verificar autenticação
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
      fetchPedidos();
      fetchTrajetos();
      fetchClientes();
      fetchProdutos();
    }
  }, [userData]);

  // Funções para buscar dados
  const fetchPedidos = async () => {
    try {
      const response = await fetch(`http://localhost:5000/pedidos/vendedor/${userData?.id}`, {
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
      const response = await fetch(`http://localhost:5000/trajetos/vendedor/${userData?.id}`, {
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
      const response = await fetch(`http://localhost:5000/clientes/vendedor/${userData?.id}`, {
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

  // Funções para criar novos registros
  const handleAdicionarAoCarrinho = () => {
    const produto = produtos.find(p => p._id === itemAtual.produtoId);
    if (!produto) {
      setMessage({ type: "error", text: "Selecione um produto válido" });
      return;
    }

    const novoItem: ItemCarrinho = {
      id: Date.now().toString(),
      produtoId: produto._id,
      produtoNome: produto.name,
      categoria: produto.categoria,
      tamanho: produto.tamanho,
      quantidade: itemAtual.quantidade,
      precoUnitario: produto.preco,
      precoTotal: produto.preco * itemAtual.quantidade,
      observacoes: itemAtual.observacoes,
      foto: fotoItemAtual || undefined,
      previewFoto: previewFotoAtual || undefined,
    };

    setCarrinho([...carrinho, novoItem]);
    setItemAtual({ categoria: "", produtoId: "", quantidade: 1, observacoes: "" });
    setFotoItemAtual(null);
    setPreviewFotoAtual(null);
    setMessage({ type: "success", text: "Item adicionado ao carrinho!" });
  };

  const handleRemoverDoCarrinho = (id: string) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const handleFinalizarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (carrinho.length === 0) {
      setMessage({ type: "error", text: "Adicione pelo menos um item ao carrinho!" });
      return;
    }

    if (!novoPedido.nomeCliente || !novoPedido.entrega) {
      setMessage({ type: "error", text: "Preencha o nome do cliente e a data de entrega!" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Criar um pedido para cada item do carrinho
      for (const item of carrinho) {
        const formData = new FormData();
        formData.append("nomeCliente", novoPedido.nomeCliente);
        formData.append("produtoId", item.produtoId);
        formData.append("quantidade", item.quantidade.toString());
        formData.append("preco", item.precoTotal.toString());
        formData.append("entrega", novoPedido.entrega);
        formData.append("observacoes", item.observacoes);
        formData.append("vendedorId", userData?.id || "");
        formData.append("status", "Pendente");
        
        if (item.foto) {
          formData.append("photo", item.foto);
        }

        const response = await fetch("http://localhost:5000/pedidos", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${getToken()}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao criar pedido");
        }
      }

      setMessage({ type: "success", text: `Venda finalizada! ${carrinho.length} pedido(s) criado(s) com sucesso!` });
      setNovoPedido({ nomeCliente: "", entrega: "" });
      setCarrinho([]);
      fetchPedidos();
      setActiveTab("pedidos");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao finalizar venda" });
    } finally {
      setLoading(false);
    }
  };

  const handleCriarTrajeto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("http://localhost:5000/trajeto", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...novoTrajeto,
          vendedorId: userData?.id,
          status: "Pendente",
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Trajeto cadastrado com sucesso!" });
        setNovoTrajeto({ nomeCliente: "", cidade: "", estado: "", rua: "", bairro: "", cep: "", complemento: "", pontoReferencia: "", dataVisita: "" });
        fetchTrajetos();
        setActiveTab("trajetos");
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao cadastrar trajeto" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("http://localhost:5000/clientes", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...novoCliente,
          vendedorId: userData?.id,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Cliente cadastrado com sucesso!" });
        setNovoCliente({ nome: "", email: "", telefone: "", cidade: "", estado: "", rua: "", numero: "", bairro: "", cep: "", complemento: "" });
        fetchClientes();
        setActiveTab("clientes");
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao cadastrar cliente" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  // Função para lidar com a seleção de foto do item atual
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoItemAtual(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewFotoAtual(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removerFoto = () => {
    setFotoItemAtual(null);
    setPreviewFotoAtual(null);
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
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-500">Fox Uniformes</h1>
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
              📦 Meus Pedidos
            </button>
            <button
              onClick={() => setActiveTab("novoPedido")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novoPedido" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              🛒 Nova Venda
            </button>
            <button
              onClick={() => setActiveTab("trajetos")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "trajetos" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              🗺️ Minhas Rotas
            </button>
            <button
              onClick={() => setActiveTab("novoTrajeto")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novoTrajeto" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              ➕ Nova Rota
            </button>
            <button
              onClick={() => setActiveTab("clientes")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "clientes" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              👥 Meus Clientes
            </button>
            <button
              onClick={() => setActiveTab("novoCliente")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novoCliente" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              ➕ Novo Cliente
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
              <h2 className="text-3xl font-bold mb-6">Painel de Controle</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg text-gray-400">Total de Pedidos</h3>
                  <p className="text-4xl font-bold text-orange-500">{pedidos.length}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg text-gray-400">Rotas Cadastradas</h3>
                  <p className="text-4xl font-bold text-blue-500">{trajetos.length}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg text-gray-400">Clientes</h3>
                  <p className="text-4xl font-bold text-green-500">{clientes.length}</p>
                </div>
              </div>

              {/* Pedidos Recentes */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Pedidos Recentes</h3>
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                  {pedidos.slice(0, 5).map((pedido) => (
                    <div key={pedido._id} className="flex justify-between items-center p-4 border-b border-gray-700">
                      <div>
                        <p className="font-semibold">{pedido.nomeCliente}</p>
                        <p className="text-sm text-gray-400">{pedido.produtoId?.name || "Produto"}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(pedido.status)}`}>
                        {pedido.status}
                      </span>
                    </div>
                  ))}
                  {pedidos.length === 0 && (
                    <p className="p-4 text-gray-400">Nenhum pedido encontrado</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lista de Pedidos */}
          {activeTab === "pedidos" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Meus Pedidos</h2>
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Produto</th>
                      <th className="px-4 py-3 text-left">Qtd</th>
                      <th className="px-4 py-3 text-left">Preço</th>
                      <th className="px-4 py-3 text-left">Entrega</th>
                      <th className="px-4 py-3 text-left">Foto</th>
                      <th className="px-4 py-3 text-left">Status</th>
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
                                📝 {pedido.observacoes.substring(0, 30)}...
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{pedido.produtoId?.name || "N/A"}</td>
                        <td className="px-4 py-3">{pedido.quantidade}</td>
                        <td className="px-4 py-3">R$ {pedido.preco?.toFixed(2)}</td>
                        <td className="px-4 py-3">{pedido.entrega}</td>
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

          {/* Novo Pedido - Sistema de Carrinho */}
          {activeTab === "novoPedido" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">🛒 Nova Venda</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulário de Adicionar Item */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-800 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <span>📦</span> Adicionar Produto ao Carrinho
                    </h3>
                    
                    {/* Informações do Cliente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-700">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Nome do Cliente *</label>
                        <input
                          type="text"
                          value={novoPedido.nomeCliente}
                          onChange={(e) => setNovoPedido({ ...novoPedido, nomeCliente: e.target.value })}
                          className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Digite o nome do cliente"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Data de Entrega *</label>
                        <input
                          type="date"
                          value={novoPedido.entrega}
                          onChange={(e) => setNovoPedido({ ...novoPedido, entrega: e.target.value })}
                          className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Seleção de Produto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Categoria */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                        <select
                          value={itemAtual.categoria}
                          onChange={(e) => {
                            setItemAtual({ 
                              ...itemAtual, 
                              categoria: e.target.value,
                              produtoId: ""
                            });
                          }}
                          className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Selecione uma categoria</option>
                          {categorias.map((categoria) => (
                            <option key={categoria} value={categoria}>
                              {categoria}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Produto */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Produto</label>
                        <select
                          value={itemAtual.produtoId}
                          onChange={(e) => setItemAtual({ ...itemAtual, produtoId: e.target.value })}
                          className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          disabled={!itemAtual.categoria}
                        >
                          <option value="">
                            {itemAtual.categoria ? "Selecione um produto" : "Selecione uma categoria primeiro"}
                          </option>
                          {produtosFiltrados.map((produto) => (
                            <option key={produto._id} value={produto._id}>
                              {produto.name} - R$ {produto.preco?.toFixed(2)} ({produto.tamanho})
                            </option>
                          ))}
                        </select>
                        {itemAtual.categoria && produtosFiltrados.length === 0 && (
                          <p className="text-xs text-yellow-400 mt-1">Nenhum produto nesta categoria</p>
                        )}
                      </div>

                      {/* Quantidade */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
                        <input
                          type="number"
                          min="1"
                          value={itemAtual.quantidade}
                          onChange={(e) => setItemAtual({ ...itemAtual, quantidade: parseInt(e.target.value) || 1 })}
                          className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      {/* Preço Prévia */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Preço do Item</label>
                        <div className="w-full bg-gray-600 rounded-lg px-4 py-2 text-orange-400 font-semibold">
                          {itemAtual.produtoId ? (
                            `R$ ${((produtos.find(p => p._id === itemAtual.produtoId)?.preco || 0) * itemAtual.quantidade).toFixed(2)}`
                          ) : (
                            "Selecione um produto"
                          )}
                        </div>
                      </div>

                      {/* Observações do Item */}
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-1">Observações / Personalização do Item</label>
                        <textarea
                          value={itemAtual.observacoes}
                          onChange={(e) => setItemAtual({ ...itemAtual, observacoes: e.target.value })}
                          placeholder="Descreva personalizações, cores específicas, etc."
                          className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
                        />
                      </div>

                      {/* Upload de Foto do Item */}
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-1">📷 Foto de Referência (opcional)</label>
                        
                        {!previewFotoAtual ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-gray-750 transition">
                            <div className="flex flex-col items-center justify-center py-4">
                              <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm text-gray-400">
                                <span className="font-semibold text-orange-400">Clique para enviar</span>
                              </p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFotoChange}
                            />
                          </label>
                        ) : (
                          <div className="relative">
                            <img 
                              src={previewFotoAtual} 
                              alt="Preview" 
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={removerFoto}
                              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão Adicionar ao Carrinho */}
                    <button
                      type="button"
                      onClick={handleAdicionarAoCarrinho}
                      disabled={!itemAtual.produtoId}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>➕</span> Adicionar ao Carrinho
                    </button>
                  </div>
                </div>

                {/* Carrinho */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-800 p-6 rounded-xl sticky top-4">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <span>🛒</span> Carrinho
                      {carrinho.length > 0 && (
                        <span className="bg-orange-600 text-sm px-2 py-1 rounded-full">
                          {carrinho.length} {carrinho.length === 1 ? "item" : "itens"}
                        </span>
                      )}
                    </h3>

                    {carrinho.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p>Carrinho vazio</p>
                        <p className="text-sm mt-1">Adicione produtos para começar</p>
                      </div>
                    ) : (
                      <>
                        {/* Lista de Itens */}
                        <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                          {carrinho.map((item) => (
                            <div key={item.id} className="bg-gray-700 p-3 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{item.produtoNome}</p>
                                  <p className="text-xs text-gray-400">
                                    {item.categoria} • {item.tamanho}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {item.quantidade}x R$ {item.precoUnitario.toFixed(2)}
                                  </p>
                                  {item.observacoes && (
                                    <p className="text-xs text-orange-400 mt-1 truncate" title={item.observacoes}>
                                      📝 {item.observacoes}
                                    </p>
                                  )}
                                  {item.previewFoto && (
                                    <p className="text-xs text-green-400 mt-1">📷 Com foto</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-orange-400">
                                    R$ {item.precoTotal.toFixed(2)}
                                  </p>
                                  <button
                                    onClick={() => handleRemoverDoCarrinho(item.id)}
                                    className="text-red-400 hover:text-red-300 text-xs mt-1"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="border-t border-gray-600 pt-4 mb-4">
                          <div className="flex justify-between items-center text-lg">
                            <span className="font-semibold">Total:</span>
                            <span className="font-bold text-2xl text-green-400">
                              R$ {totalCarrinho.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Botão Finalizar */}
                        <button
                          onClick={handleFinalizarVenda}
                          disabled={loading || !novoPedido.nomeCliente || !novoPedido.entrega}
                          className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            "Processando..."
                          ) : (
                            <>
                              <span>✅</span> Finalizar Venda
                            </>
                          )}
                        </button>
                        
                        {(!novoPedido.nomeCliente || !novoPedido.entrega) && (
                          <p className="text-xs text-yellow-400 mt-2 text-center">
                            Preencha o cliente e data de entrega
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Trajetos */}
          {activeTab === "trajetos" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Minhas Rotas</h2>
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
                      <p className="text-orange-400 text-sm mt-2">
                        Visita: {new Date(trajeto.dataVisita).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
                {trajetos.length === 0 && (
                  <p className="text-gray-400 col-span-3 text-center py-8">Nenhuma rota cadastrada</p>
                )}
              </div>
            </div>
          )}

          {/* Novo Trajeto */}
          {activeTab === "novoTrajeto" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Cadastrar Nova Rota</h2>
              <form onSubmit={handleCriarTrajeto} className="bg-gray-800 p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      value={novoTrajeto.nomeCliente}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, nomeCliente: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={novoTrajeto.cidade}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, cidade: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Estado</label>
                    <input
                      type="text"
                      value={novoTrajeto.estado}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, estado: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Rua</label>
                    <input
                      type="text"
                      value={novoTrajeto.rua}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, rua: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={novoTrajeto.bairro}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, bairro: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">CEP</label>
                    <input
                      type="text"
                      value={novoTrajeto.cep}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, cep: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={novoTrajeto.complemento}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, complemento: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Ponto de Referência</label>
                    <input
                      type="text"
                      value={novoTrajeto.pontoReferencia}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, pontoReferencia: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Data da Visita</label>
                    <input
                      type="date"
                      value={novoTrajeto.dataVisita}
                      onChange={(e) => setNovoTrajeto({ ...novoTrajeto, dataVisita: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? "Cadastrando..." : "Cadastrar Rota"}
                </button>
              </form>
            </div>
          )}

          {/* Lista de Clientes */}
          {activeTab === "clientes" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Meus Clientes</h2>
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
                  </div>
                ))}
                {clientes.length === 0 && (
                  <p className="text-gray-400 col-span-3 text-center py-8">Nenhum cliente cadastrado</p>
                )}
              </div>
            </div>
          )}

          {/* Novo Cliente */}
          {activeTab === "novoCliente" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Cadastrar Novo Cliente</h2>
              <form onSubmit={handleCriarCliente} className="bg-gray-800 p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={novoCliente.nome}
                      onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={novoCliente.telefone}
                      onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={novoCliente.email}
                      onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={novoCliente.cidade}
                      onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Estado</label>
                    <input
                      type="text"
                      value={novoCliente.estado}
                      onChange={(e) => setNovoCliente({ ...novoCliente, estado: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Rua</label>
                    <input
                      type="text"
                      value={novoCliente.rua}
                      onChange={(e) => setNovoCliente({ ...novoCliente, rua: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Número</label>
                    <input
                      type="text"
                      value={novoCliente.numero}
                      onChange={(e) => setNovoCliente({ ...novoCliente, numero: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={novoCliente.bairro}
                      onChange={(e) => setNovoCliente({ ...novoCliente, bairro: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">CEP</label>
                    <input
                      type="text"
                      value={novoCliente.cep}
                      onChange={(e) => setNovoCliente({ ...novoCliente, cep: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={novoCliente.complemento}
                      onChange={(e) => setNovoCliente({ ...novoCliente, complemento: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? "Cadastrando..." : "Cadastrar Cliente"}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

