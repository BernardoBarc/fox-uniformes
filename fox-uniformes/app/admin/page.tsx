"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../config/api";

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
  categoria: Categoria | string;
  descricao: string;
  imagem?: string;
}

interface Categoria {
  _id: string;
  name: string;
  descricao?: string;
  ativo: boolean;
  createdAt: string;
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

interface Cupom {
  _id: string;
  codigo: string;
  desconto: number;
  valorMinimo: number;
  ativo: boolean;
  dataValidade: string | null;
  usoMaximo: number | null;
  vezesUsado: number;
  criadoPor: { _id: string; name: string; login: string };
  createdAt: string;
}

type TabType = "dashboard" | "pedidos" | "vendedores" | "produtos" | "clientes" | "trajetos" | "novoVendedor" | "novoProduto" | "cupons" | "novoCupom" | "novoCliente" | "categorias" | "novaCategoria";

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
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

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
  });

  const [novoCupom, setNovoCupom] = useState({
    codigo: "",
    desconto: 10,
    valorMinimo: 0,
    dataValidade: "",
    usoMaximo: "",
    notificarClientes: true,
  });

  const [novaCategoria, setNovaCategoria] = useState({
    name: "",
    descricao: "",
  });

  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    cpf: "",
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

  const [erroValidacaoCPF, setErroValidacaoCPF] = useState<string | null>(null);

  const [editProdutoId, setEditProdutoId] = useState<string | null>(null);
  const [editProdutoData, setEditProdutoData] = useState<Produto | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

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
        const response = await fetch(`${API_URL}/auth/verify`, {
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
    fetchCupons();
    fetchCategorias();
  };

  // Funções para buscar dados (TODOS, não apenas do vendedor)
  const fetchPedidos = async () => {
    try {
      const response = await fetch(`${API_URL}/pedidos`, {
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
      const response = await fetch(`${API_URL}/trajetos`, {
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
      const response = await fetch(`${API_URL}/clientes`, {
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
      const response = await fetch(`${API_URL}/produtos`, {
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
      const response = await fetch(`${API_URL}/users`, {
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

  const fetchCupons = async () => {
    try {
      const response = await fetch(`${API_URL}/cupons`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCupons(data);
      }
    } catch (error) {
      console.error("Erro ao buscar cupons:", error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch(`${API_URL}/categorias`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    }
  };

  // Função para atualizar status do pedido
  const handleUpdatePedidoStatus = async (pedidoId: string, novoStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/pedidos/${pedidoId}`, {
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
      const response = await fetch(`${API_URL}/users`, {
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
      const response = await fetch(`${API_URL}/produtos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(novoProduto),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Produto cadastrado com sucesso!" });
        setNovoProduto({ name: "", descricao: "", preco: 0, categoria: "" });
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

  // Função para editar produto
  const handleAbrirEditarProduto = (produto: Produto) => {
    setEditProdutoId(produto._id);
    setEditProdutoData({ ...produto });
    setEditModalOpen(true);
  };

  const handleSalvarEdicaoProduto = async () => {
    if (!editProdutoId || !editProdutoData) return;
    try {
      const response = await fetch(`${API_URL}/produtos/${editProdutoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProdutoData),
      });
      if (response.ok) {
        setEditModalOpen(false);
        setEditProdutoId(null);
        setEditProdutoData(null);
        fetchProdutos();
      } else {
        alert("Erro ao salvar edição do produto.");
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  // Função para deletar vendedor
  const handleDeletarVendedor = async (vendedorId: string) => {
    if (!confirm("Tem certeza que deseja excluir este vendedor?")) return;

    try {
      const response = await fetch(`${API_URL}/users/${vendedorId}`, {
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
      const response = await fetch(`${API_URL}/produtos/${produtoId}`, {
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

  // Função para formatar CPF
  const formatarCPF = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  };

  // Função para validar CPF (algoritmo oficial)
  const validarCPF = (cpf: string): boolean => {
    const cpfLimpo = cpf.replace(/\D/g, "");
    
    if (cpfLimpo.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpfLimpo)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
    
    return true;
  };

  // Função para criar cliente
  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!validarCPF(novoCliente.cpf)) {
      setMessage({ type: "error", text: "CPF inválido! Por favor, verifique o número." });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/clientes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...novoCliente,
          cpf: novoCliente.cpf.replace(/\D/g, ""),
          vendedorId: userData?.id,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Cliente cadastrado com sucesso!" });
        setNovoCliente({ nome: "", cpf: "", email: "", telefone: "", cidade: "", estado: "", rua: "", numero: "", bairro: "", cep: "", complemento: "" });
        setErroValidacaoCPF(null);
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

  // Função para criar cupom
  const handleCriarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/cupons`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          codigo: novoCupom.codigo,
          desconto: novoCupom.desconto,
          valorMinimo: novoCupom.valorMinimo || 0,
          dataValidade: novoCupom.dataValidade || null,
          usoMaximo: novoCupom.usoMaximo ? parseInt(novoCupom.usoMaximo) : null,
          criadoPor: userData?.id,
          notificarClientes: novoCupom.notificarClientes,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Cupom criado com sucesso! Clientes serão notificados via WhatsApp." });
        setNovoCupom({
          codigo: "",
          desconto: 10,
          valorMinimo: 0,
          dataValidade: "",
          usoMaximo: "",
          notificarClientes: true,
        });
        fetchCupons();
        setActiveTab("cupons");
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao criar cupom" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  // Função para ativar/desativar cupom
  const handleToggleCupom = async (cupomId: string, ativo: boolean) => {
    try {
      const endpoint = ativo ? "desativar" : "ativar";
      const response = await fetch(`${API_URL}/cupons/${cupomId}/${endpoint}`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setMessage({ type: "success", text: `Cupom ${ativo ? "desativado" : "ativado"} com sucesso!` });
        fetchCupons();
      } else {
        setMessage({ type: "error", text: "Erro ao atualizar cupom" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  // Função para deletar cupom
  const handleDeletarCupom = async (cupomId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;

    try {
      const response = await fetch(`${API_URL}/cupons/${cupomId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Cupom excluído com sucesso!" });
        fetchCupons();
      } else {
        setMessage({ type: "error", text: "Erro ao excluir cupom" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  // Função para reenviar notificação do cupom
  const handleReenviarNotificacao = async (cupomId: string) => {
    if (!confirm("Enviar notificação deste cupom para todos os clientes?")) return;

    try {
      const response = await fetch(`${API_URL}/cupons/${cupomId}/reenviar`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: "success", text: `Notificações enviadas: ${data.enviados} sucesso, ${data.erros} erros` });
      } else {
        setMessage({ type: "error", text: "Erro ao enviar notificações" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  // Função para criar categoria
  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/categorias`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(novaCategoria),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Categoria criada com sucesso!" });
        setNovaCategoria({ name: "", descricao: "" });
        fetchCategorias();
        setActiveTab("categorias");
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao criar categoria" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  // Função para ativar/desativar categoria
  const handleToggleCategoria = async (categoriaId: string, ativo: boolean) => {
    try {
      const response = await fetch(`${API_URL}/categorias/${categoriaId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ativo: !ativo }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: `Categoria ${ativo ? "desativada" : "ativada"} com sucesso!` });
        fetchCategorias();
      } else {
        setMessage({ type: "error", text: "Erro ao atualizar categoria" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  // Função para deletar categoria
  const handleDeletarCategoria = async (categoriaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Produtos vinculados podem ser afetados.")) return;

    try {
      const response = await fetch(`${API_URL}/categorias/${categoriaId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Categoria excluída com sucesso!" });
        fetchCategorias();
      } else {
        setMessage({ type: "error", text: "Erro ao excluir categoria" });
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
      case "Em Trânsito": return "bg-indigo-500";
      case "Concluído": return "bg-green-500";
      case "Cancelado": return "bg-red-500";
      case "Aguardando Pagamento": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  // Pedidos ativos (excluindo cancelados)
  const pedidosAtivos = pedidos.filter(p => p.status !== "Cancelado");

  // Estatísticas (usando pedidos ativos)
  const pedidosPendentes = pedidosAtivos.filter(p => p.status === "Pendente").length;
  const pedidosEmProgresso = pedidosAtivos.filter(p => p.status === "Em Progresso").length;
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
              onClick={() => setActiveTab("categorias")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "categorias" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              📂 Categorias
              {categorias.length > 0 && (
                <span className="ml-2 bg-purple-500 text-xs px-2 py-1 rounded-full">{categorias.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("novaCategoria")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novaCategoria" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              ➕ Nova Categoria
            </button>
            <button
              onClick={() => setActiveTab("clientes")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "clientes" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              👥 Todos Clientes
            </button>
            <button
              onClick={() => setActiveTab("novoCliente")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novoCliente" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              ➕ Novo Cliente
            </button>
            <button
              onClick={() => setActiveTab("trajetos")}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "trajetos" ? "bg-orange-600" : "hover:bg-gray-700"}`}
            >
              🗺️ Todas Rotas
            </button>
            
            {/* Seção de Cupons */}
            <div className="border-t border-gray-700 mt-4 pt-4">
              <p className="text-xs text-gray-500 uppercase mb-2 px-4">Marketing</p>
              <button
                onClick={() => setActiveTab("cupons")}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "cupons" ? "bg-orange-600" : "hover:bg-gray-700"}`}
              >
                🏷️ Cupons de Desconto
                {cupons.filter(c => c.ativo).length > 0 && (
                  <span className="ml-2 bg-green-500 text-xs px-2 py-1 rounded-full">{cupons.filter(c => c.ativo).length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("novoCupom")}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === "novoCupom" ? "bg-orange-600" : "hover:bg-gray-700"}`}
              >
                ➕ Novo Cupom
              </button>
            </div>
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
                    {pedidosAtivos.map((pedido) => (
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
                            <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                            <option value="Em Progresso">Em Progresso</option>
                            <option value="Em Trânsito">Em Trânsito</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pedidosAtivos.length === 0 && (
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
                        <td className="px-4 py-3">{typeof produto.categoria === 'object' ? produto.categoria?.name : produto.categoria}</td>
                        <td className="px-4 py-3">R$ {produto.preco?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleAbrirEditarProduto(produto)}
                            className="text-blue-500 hover:text-blue-400 mr-2"
                          >
                            ✏️ Editar
                          </button>
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
                      {categorias.filter(c => c.ativo).map((cat) => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                    {categorias.filter(c => c.ativo).length === 0 && (
                      <p className="text-xs text-yellow-500 mt-1">⚠️ Nenhuma categoria cadastrada. <button type="button" onClick={() => setActiveTab("novaCategoria")} className="underline">Criar uma</button></p>
                    )}
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

          {/* Lista de Cupons */}
          {activeTab === "cupons" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Cupons de Desconto</h2>
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Desconto</th>
                      <th className="px-4 py-3 text-left">Valor Mínimo</th>
                      <th className="px-4 py-3 text-left">Validade</th>
                      <th className="px-4 py-3 text-left">Usos</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cupons.map((cupom) => (
                      <tr key={cupom._id} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-orange-400">{cupom.codigo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-green-600 px-2 py-1 rounded text-sm font-bold">{cupom.desconto}%</span>
                        </td>
                        <td className="px-4 py-3">
                          {cupom.valorMinimo > 0 ? `R$ ${cupom.valorMinimo.toFixed(2)}` : "Sem mínimo"}
                        </td>
                        <td className="px-4 py-3">
                          {cupom.dataValidade 
                            ? new Date(cupom.dataValidade).toLocaleDateString() 
                            : "Sem validade"}
                        </td>
                        <td className="px-4 py-3">
                          {cupom.vezesUsado}{cupom.usoMaximo ? `/${cupom.usoMaximo}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs ${cupom.ativo ? "bg-green-600" : "bg-red-600"}`}>
                            {cupom.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleCupom(cupom._id, cupom.ativo)}
                              className={`px-3 py-1 rounded text-xs ${cupom.ativo ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}
                            >
                              {cupom.ativo ? "Desativar" : "Ativar"}
                            </button>
                            <button
                              onClick={() => handleReenviarNotificacao(cupom._id)}
                              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
                              title="Reenviar notificação"
                            >
                              📱
                            </button>
                            <button
                              onClick={() => handleDeletarCupom(cupom._id)}
                              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cupons.length === 0 && (
                  <p className="p-4 text-gray-400 text-center">Nenhum cupom cadastrado</p>
                )}
              </div>
            </div>
          )}

          {/* Criar Novo Cupom */}
          {activeTab === "novoCupom" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Criar Novo Cupom</h2>
              <form onSubmit={handleCriarCupom} className="bg-gray-800 p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Código do Cupom</label>
                    <input
                      type="text"
                      value={novoCupom.codigo}
                      onChange={(e) => setNovoCupom({ ...novoCupom, codigo: e.target.value.toUpperCase() })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono uppercase"
                      placeholder="Ex: DESCONTO20, PRIMEIRACOMPRA"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Desconto (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={novoCupom.desconto}
                      onChange={(e) => setNovoCupom({ ...novoCupom, desconto: parseInt(e.target.value) })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Valor Mínimo do Pedido (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={novoCupom.valorMinimo}
                      onChange={(e) => setNovoCupom({ ...novoCupom, valorMinimo: parseFloat(e.target.value) })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0 = sem mínimo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Data de Validade (opcional)</label>
                    <input
                      type="date"
                      value={novoCupom.dataValidade}
                      onChange={(e) => setNovoCupom({ ...novoCupom, dataValidade: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Limite de Uso (opcional)</label>
                    <input
                      type="number"
                      min="1"
                      value={novoCupom.usoMaximo}
                      onChange={(e) => setNovoCupom({ ...novoCupom, usoMaximo: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Vazio = uso ilimitado"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novoCupom.notificarClientes}
                        onChange={(e) => setNovoCupom({ ...novoCupom, notificarClientes: e.target.checked })}
                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-gray-300">📱 Notificar todos os clientes via WhatsApp</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-7">
                      Uma mensagem será enviada automaticamente para todos os clientes cadastrados
                    </p>
                  </div>
                </div>

                {/* Preview do Cupom */}
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Preview:</p>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xl font-bold text-orange-400">{novoCupom.codigo || "CODIGO"}</span>
                    <span className="bg-green-600 px-3 py-1 rounded-lg font-bold">{novoCupom.desconto}% OFF</span>
                    {novoCupom.valorMinimo > 0 && (
                      <span className="text-sm text-gray-400">Pedido mínimo: R$ {novoCupom.valorMinimo.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? "Criando..." : "🎉 Criar Cupom"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Cadastrar Novo Cliente */}
          {activeTab === "novoCliente" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Cadastrar Novo Cliente</h2>
              <form onSubmit={handleCriarCliente} className="bg-gray-800 p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={novoCliente.nome}
                      onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">CPF *</label>
                    <input
                      type="text"
                      value={novoCliente.cpf}
                      onChange={(e) => {
                        const cpfFormatado = formatarCPF(e.target.value);
                        setNovoCliente({ ...novoCliente, cpf: cpfFormatado });
                        if (cpfFormatado.length === 14) {
                          if (!validarCPF(cpfFormatado)) {
                            setErroValidacaoCPF("CPF inválido!");
                          } else {
                            setErroValidacaoCPF(null);
                          }
                        } else {
                          setErroValidacaoCPF(null);
                        }
                      }}
                      className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 ${
                        erroValidacaoCPF ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-orange-500"
                      }`}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                    {erroValidacaoCPF && (
                      <p className="text-xs text-red-500 mt-1">❌ {erroValidacaoCPF}</p>
                    )}
                    {novoCliente.cpf.length === 14 && !erroValidacaoCPF && (
                      <p className="text-xs text-green-500 mt-1">✅ CPF válido</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Telefone (WhatsApp) *</label>
                    <input
                      type="tel"
                      value={novoCliente.telefone}
                      onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="(00) 00000-0000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Links de pagamento serão enviados para este número</p>
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
                    <label className="block text-sm text-gray-400 mb-1">Cidade *</label>
                    <input
                      type="text"
                      value={novoCliente.cidade}
                      onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Estado *</label>
                    <input
                      type="text"
                      value={novoCliente.estado}
                      onChange={(e) => setNovoCliente({ ...novoCliente, estado: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Rua *</label>
                    <input
                      type="text"
                      value={novoCliente.rua}
                      onChange={(e) => setNovoCliente({ ...novoCliente, rua: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Número *</label>
                    <input
                      type="text"
                      value={novoCliente.numero}
                      onChange={(e) => setNovoCliente({ ...novoCliente, numero: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Bairro *</label>
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
                  {loading ? "Cadastrando..." : "👤 Cadastrar Cliente"}
                </button>
              </form>
            </div>
          )}

          {/* Lista de Categorias */}
          {activeTab === "categorias" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Categorias de Produtos</h2>
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">Descrição</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Criada em</th>
                      <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((categoria) => (
                      <tr key={categoria._id} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-orange-400">{categoria.name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {categoria.descricao || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs ${categoria.ativo ? "bg-green-600" : "bg-red-600"}`}>
                            {categoria.ativo ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {new Date(categoria.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleCategoria(categoria._id, categoria.ativo)}
                              className={`px-3 py-1 rounded text-xs ${categoria.ativo ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}
                            >
                              {categoria.ativo ? "Desativar" : "Ativar"}
                            </button>
                            <button
                              onClick={() => handleDeletarCategoria(categoria._id)}
                              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {categorias.length === 0 && (
                  <p className="p-4 text-gray-400 text-center">Nenhuma categoria cadastrada. <button onClick={() => setActiveTab("novaCategoria")} className="text-orange-400 underline">Criar primeira categoria</button></p>
                )}
              </div>
            </div>
          )}

          {/* Criar Nova Categoria */}
          {activeTab === "novaCategoria" && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Criar Nova Categoria</h2>
              <form onSubmit={handleCriarCategoria} className="bg-gray-800 p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome da Categoria *</label>
                    <input
                      type="text"
                      value={novaCategoria.name}
                      onChange={(e) => setNovaCategoria({ ...novaCategoria, name: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Ex: Polo, Camiseta, Calça..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Descrição (opcional)</label>
                    <textarea
                      value={novaCategoria.descricao}
                      onChange={(e) => setNovaCategoria({ ...novaCategoria, descricao: e.target.value })}
                      className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={3}
                      placeholder="Uma breve descrição desta categoria..."
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Preview:</p>
                  <div className="flex items-center gap-4">
                    <span className="bg-purple-600 px-4 py-2 rounded-lg font-bold">{novaCategoria.name || "Nome da Categoria"}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? "Criando..." : "📂 Criar Categoria"}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Modal de edição de produto */}
      {editModalOpen && editProdutoData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Editar Produto</h2>
            <label className="block text-sm text-gray-400 mb-1">Nome</label>
            <input
              type="text"
              value={editProdutoData.name}
              onChange={e => setEditProdutoData({ ...editProdutoData, name: e.target.value })}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 mb-2"
            />
            <label className="block text-sm text-gray-400 mb-1">Descrição</label>
            <textarea
              value={editProdutoData.descricao}
              onChange={e => setEditProdutoData({ ...editProdutoData, descricao: e.target.value })}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 mb-2"
              rows={2}
            />
            <label className="block text-sm text-gray-400 mb-1">Preço</label>
            <input
              type="number"
              value={editProdutoData.preco}
              onChange={e => setEditProdutoData({ ...editProdutoData, preco: Number(e.target.value) })}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 mb-2"
              min={0}
              step={0.01}
            />
            <label className="block text-sm text-gray-400 mb-1">Categoria</label>
            <input
              type="text"
              value={typeof editProdutoData.categoria === 'object' ? editProdutoData.categoria?.name : editProdutoData.categoria}
              onChange={e => setEditProdutoData({ ...editProdutoData, categoria: e.target.value })}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 mb-4"
            />
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500"
              >Cancelar</button>
              <button
                onClick={handleSalvarEdicaoProduto}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500"
              >Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
