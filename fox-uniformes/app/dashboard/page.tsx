"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../config/api";

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
  cpf: string;
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
  
  // Estados para edição de cliente
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [mostrarModalEdicao, setMostrarModalEdicao] = useState(false);
  const [erroValidacaoCPF, setErroValidacaoCPF] = useState<string | null>(null);

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
    cpfCliente: "",
    telefoneCliente: "",
    entrega: "",
  });
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  
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

  // Estados para cupom de desconto
  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{
    _id: string;
    codigo: string;
    desconto: number;
    valorDesconto: number;
    valorFinal: number;
  } | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState<string | null>(null);

  // Total final (com desconto se houver)
  const totalFinal = cupomAplicado ? cupomAplicado.valorFinal : totalCarrinho;

  // Pedidos ativos (excluindo cancelados)
  const pedidosAtivos = pedidos.filter(p => p.status !== "Cancelado");

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
        const response = await fetch(`${API_URL}/auth/verify`, {
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
      const response = await fetch(`${API_URL}/pedidos/vendedor/${userData?.id}`, {
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
      const response = await fetch(`${API_URL}/trajetos/vendedor/${userData?.id}`, {
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
      const response = await fetch(`${API_URL}/clientes/vendedor/${userData?.id}`, {
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

  // Funções para validar e aplicar cupom
  const handleValidarCupom = async () => {
    if (!codigoCupom.trim()) {
      setErroCupom("Digite um código de cupom");
      return;
    }

    setValidandoCupom(true);
    setErroCupom(null);

    try {
      const response = await fetch(`${API_URL}/cupons/validar`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          codigo: codigoCupom,
          valorPedido: totalCarrinho,
        }),
      });

      const data = await response.json();

      if (data.valido) {
        setCupomAplicado(data.cupom);
        setMessage({ type: "success", text: data.mensagem });
      } else {
        setErroCupom(data.mensagem);
        setCupomAplicado(null);
      }
    } catch (error) {
      setErroCupom("Erro ao validar cupom");
    } finally {
      setValidandoCupom(false);
    }
  };

  const handleRemoverCupom = () => {
    setCupomAplicado(null);
    setCodigoCupom("");
    setErroCupom(null);
    setMessage({ type: "success", text: "Cupom removido" });
  };

  // Revalidar cupom quando o carrinho mudar
  useEffect(() => {
    if (cupomAplicado && totalCarrinho > 0) {
      // Recalcular desconto com novo valor do carrinho
      const valorDesconto = (totalCarrinho * cupomAplicado.desconto) / 100;
      const valorFinal = totalCarrinho - valorDesconto;
      setCupomAplicado({
        ...cupomAplicado,
        valorDesconto,
        valorFinal,
      });
    }
  }, [totalCarrinho]);

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
    
    // Verifica se tem 11 dígitos
    if (cpfLimpo.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais (CPFs inválidos como 111.111.111-11)
    if (/^(\d)\1+$/.test(cpfLimpo)) return false;
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
    
    return true;
  };

  // Função para atualizar cliente
  const handleAtualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteEditando) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/clientes/${clienteEditando._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(clienteEditando),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Cliente atualizado com sucesso!" });
        setMostrarModalEdicao(false);
        setClienteEditando(null);
        fetchClientes();
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Erro ao atualizar cliente" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de edição
  const abrirEdicaoCliente = (cliente: Cliente) => {
    setClienteEditando({ ...cliente });
    setMostrarModalEdicao(true);
  };

  // Função para buscar cliente por CPF
  const buscarClientePorCPF = async (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      setClienteSelecionado(null);
      return;
    }

    setBuscandoCliente(true);
    try {
      const response = await fetch(`${API_URL}/clientes/cpf/${cpfLimpo}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const cliente = await response.json();
        setClienteSelecionado(cliente);
        setNovoPedido(prev => ({
          ...prev,
          nomeCliente: cliente.nome,
          telefoneCliente: cliente.telefone,
        }));
        setMessage({ type: "success", text: `Cliente encontrado: ${cliente.nome}` });
      } else {
        setClienteSelecionado(null);
        setNovoPedido(prev => ({
          ...prev,
          nomeCliente: "",
          telefoneCliente: "",
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      setClienteSelecionado(null);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const handleFinalizarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (carrinho.length === 0) {
      setMessage({ type: "error", text: "Adicione pelo menos um item ao carrinho!" });
      return;
    }

    if (!novoPedido.nomeCliente || !novoPedido.entrega || !novoPedido.cpfCliente) {
      setMessage({ type: "error", text: "Preencha o CPF, nome do cliente e a data de entrega!" });
      return;
    }

    if (!clienteSelecionado) {
      setMessage({ type: "error", text: "Cliente não encontrado! Verifique o CPF ou cadastre o cliente primeiro." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Calcular desconto proporcional para cada item se houver cupom
      const descontoProporcional = cupomAplicado 
        ? (cupomAplicado.desconto / 100) 
        : 0;

      // Criar um pedido para cada item do carrinho
      const pedidosCriados = [];
      for (const item of carrinho) {
        const precoComDesconto = cupomAplicado 
          ? item.precoTotal - (item.precoTotal * descontoProporcional)
          : item.precoTotal;

        const formData = new FormData();
        formData.append("nomeCliente", novoPedido.nomeCliente);
        formData.append("cpfCliente", novoPedido.cpfCliente.replace(/\D/g, ""));
        formData.append("telefoneCliente", novoPedido.telefoneCliente);
        formData.append("clienteId", clienteSelecionado._id);
        formData.append("produtoId", item.produtoId);
        formData.append("quantidade", item.quantidade.toString());
        formData.append("preco", precoComDesconto.toString());
        formData.append("precoOriginal", item.precoTotal.toString());
        formData.append("entrega", novoPedido.entrega);
        formData.append("observacoes", item.observacoes);
        formData.append("vendedorId", userData?.id || "");
        formData.append("status", "Aguardando Pagamento");
        
        if (cupomAplicado) {
          formData.append("cupomAplicado", cupomAplicado._id);
          formData.append("descontoAplicado", (item.precoTotal * descontoProporcional).toString());
        }
        
        if (item.foto) {
          formData.append("photo", item.foto);
        }

        const response = await fetch(`${API_URL}/pedidos`, {
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

        const pedidoCriado = await response.json();
        pedidosCriados.push(pedidoCriado);
      }

      // Se cupom foi aplicado, incrementar uso
      if (cupomAplicado) {
        try {
          await fetch(`${API_URL}/cupons/${cupomAplicado._id}/aplicar`, {
            method: "POST",
            headers: getAuthHeaders(),
          });
        } catch (error) {
          console.warn("Aviso: Erro ao registrar uso do cupom");
        }
      }

      // Gerar link de pagamento e enviar via WhatsApp
      try {
        const pagamentoResponse = await fetch(`${API_URL}/pagamento/criar`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            clienteId: clienteSelecionado._id,
            pedidos: pedidosCriados.map(p => p._id || p.pedido?._id),
            valorTotal: totalFinal,
            telefone: novoPedido.telefoneCliente,
            nomeCliente: novoPedido.nomeCliente,
          }),
        });

        if (!pagamentoResponse.ok) {
          console.warn("Aviso: Link de pagamento não foi gerado, mas pedidos foram criados.");
        }
      } catch (pagamentoError) {
        console.warn("Aviso: Erro ao gerar link de pagamento:", pagamentoError);
      }

      const mensagemSucesso = cupomAplicado 
        ? `Venda finalizada com desconto de ${cupomAplicado.desconto}%! ${carrinho.length} pedido(s) criado(s). Link de pagamento enviado via WhatsApp.`
        : `Venda finalizada! ${carrinho.length} pedido(s) criado(s) com sucesso! Link de pagamento enviado via WhatsApp.`;
      
      setMessage({ type: "success", text: mensagemSucesso });
      setNovoPedido({ nomeCliente: "", cpfCliente: "", telefoneCliente: "", entrega: "" });
      setClienteSelecionado(null);
      setCarrinho([]);
      setCupomAplicado(null);
      setCodigoCupom("");
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
      const response = await fetch(`${API_URL}/trajeto`, {
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
    setErroValidacaoCPF(null);

    // Validar CPF antes de enviar
    if (!validarCPF(novoCliente.cpf)) {
      setErroValidacaoCPF("CPF inválido! Por favor, verifique o número digitado.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/clientes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...novoCliente,
          vendedorId: userData?.id,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Cliente cadastrado com sucesso!" });
        setNovoCliente({ nome: "", cpf: "", email: "", telefone: "", cidade: "", estado: "", rua: "", numero: "", bairro: "", cep: "", complemento: "" });
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
      case "Aguardando Pagamento": return "bg-purple-500";
      case "Em Progresso":
      case "Em Andamento": return "bg-blue-500";
      case "Em Trânsito": return "bg-indigo-500";
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
                  <h3 className="text-lg text-gray-400">Pedidos Ativos</h3>
                  <p className="text-4xl font-bold text-orange-500">{pedidosAtivos.length}</p>
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
                  {pedidosAtivos.slice(0, 5).map((pedido) => (
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
                  {pedidosAtivos.length === 0 && (
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
                    {pedidosAtivos.map((pedido) => (
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
                {pedidosAtivos.length === 0 && (
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
                    <div className="mb-6 pb-6 border-b border-gray-700">
                      <h4 className="text-lg font-medium mb-4 text-orange-400">👤 Dados do Cliente</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">CPF do Cliente *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={novoPedido.cpfCliente}
                              onChange={(e) => {
                                const cpfFormatado = formatarCPF(e.target.value);
                                setNovoPedido({ ...novoPedido, cpfCliente: cpfFormatado });
                                if (cpfFormatado.replace(/\D/g, "").length === 11) {
                                  buscarClientePorCPF(cpfFormatado);
                                }
                              }}
                              className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="000.000.000-00"
                              maxLength={14}
                            />
                            {buscandoCliente && (
                              <div className="absolute right-3 top-2.5">
                                <div className="animate-spin h-5 w-5 border-2 border-orange-500 rounded-full border-t-transparent"></div>
                              </div>
                            )}
                          </div>
                          {novoPedido.cpfCliente.replace(/\D/g, "").length === 11 && !clienteSelecionado && !buscandoCliente && (
                            <p className="text-xs text-red-400 mt-1">
                              ⚠️ Cliente não encontrado. <button 
                                type="button" 
                                onClick={() => setActiveTab("novoCliente")}
                                className="text-orange-400 underline"
                              >
                                Cadastrar novo cliente
                              </button>
                            </p>
                          )}
                          {clienteSelecionado && (
                            <p className="text-xs text-green-400 mt-1">✅ Cliente encontrado</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Nome do Cliente *</label>
                          <input
                            type="text"
                            value={novoPedido.nomeCliente}
                            onChange={(e) => setNovoPedido({ ...novoPedido, nomeCliente: e.target.value })}
                            className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            placeholder="Nome será preenchido automaticamente"
                            disabled={!!clienteSelecionado}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Telefone (WhatsApp) *</label>
                          <input
                            type="text"
                            value={novoPedido.telefoneCliente}
                            onChange={(e) => setNovoPedido({ ...novoPedido, telefoneCliente: e.target.value })}
                            className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            placeholder="(00) 00000-0000"
                            disabled={!!clienteSelecionado}
                          />
                          <p className="text-xs text-gray-500 mt-1">O link de pagamento será enviado para este número</p>
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
                      
                      {/* Card do Cliente Selecionado */}
                      {clienteSelecionado && (
                        <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-green-500/30">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-green-400">✅ Cliente Selecionado</p>
                              <p className="text-sm text-gray-300 mt-1">{clienteSelecionado.nome}</p>
                              <p className="text-xs text-gray-400">
                                📞 {clienteSelecionado.telefone} • 📧 {clienteSelecionado.email || "Sem email"}
                              </p>
                              <p className="text-xs text-gray-400">
                                📍 {clienteSelecionado.cidade} - {clienteSelecionado.estado}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setClienteSelecionado(null);
                                setNovoPedido({ ...novoPedido, cpfCliente: "", nomeCliente: "", telefoneCliente: "" });
                              }}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              ✕ Limpar
                            </button>
                          </div>
                        </div>
                      )}
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
                            <span className="font-semibold">Subtotal:</span>
                            <span className={`font-bold ${cupomAplicado ? 'line-through text-gray-500' : 'text-2xl text-green-400'}`}>
                              R$ {totalCarrinho.toFixed(2)}
                            </span>
                          </div>
                          
                          {cupomAplicado && (
                            <>
                              <div className="flex justify-between items-center text-sm text-green-400 mt-1">
                                <span>Desconto ({cupomAplicado.desconto}%):</span>
                                <span>- R$ {cupomAplicado.valorDesconto.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-lg mt-2">
                                <span className="font-semibold">Total com desconto:</span>
                                <span className="font-bold text-2xl text-green-400">
                                  R$ {totalFinal.toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Cupom de Desconto */}
                        <div className="border-t border-gray-600 pt-4 mb-4">
                          <p className="text-sm text-gray-400 mb-2">🏷️ Cupom de Desconto</p>
                          
                          {cupomAplicado ? (
                            <div className="flex items-center justify-between bg-green-900/30 p-3 rounded-lg border border-green-500/30">
                              <div>
                                <span className="font-mono font-bold text-green-400">{cupomAplicado.codigo}</span>
                                <span className="ml-2 text-sm text-green-300">({cupomAplicado.desconto}% OFF)</span>
                              </div>
                              <button
                                onClick={handleRemoverCupom}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                ✕ Remover
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={codigoCupom}
                                onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                                placeholder="Digite o código"
                                className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <button
                                onClick={handleValidarCupom}
                                disabled={validandoCupom || !codigoCupom}
                                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                              >
                                {validandoCupom ? "..." : "Aplicar"}
                              </button>
                            </div>
                          )}
                          
                          {erroCupom && (
                            <p className="text-xs text-red-400 mt-2">{erroCupom}</p>
                          )}
                        </div>

                        {/* Botão Finalizar */}
                        <button
                          onClick={handleFinalizarVenda}
                          disabled={loading || !clienteSelecionado || !novoPedido.entrega}
                          className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            "Processando..."
                          ) : (
                            <>
                              <span>✅</span> Finalizar Venda e Enviar Link
                            </>
                          )}
                        </button>
                        
                        {(!clienteSelecionado || !novoPedido.entrega) && (
                          <p className="text-xs text-yellow-400 mt-2 text-center">
                            {!clienteSelecionado ? "Informe o CPF do cliente" : "Preencha a data de entrega"}
                          </p>
                        )}

                        {/* Info sobre pagamento */}
                        <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                          <p className="text-xs text-blue-300">
                            💳 Ao finalizar, um link de pagamento será enviado via WhatsApp para o cliente com opções de PIX e Cartão de Crédito.
                          </p>
                        </div>
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
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{cliente.nome}</h3>
                      <button
                        onClick={() => abrirEdicaoCliente(cliente)}
                        className="text-orange-400 hover:text-orange-300 text-sm px-2 py-1 bg-gray-700 rounded-lg"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                    <p className="text-gray-400 text-sm">🆔 CPF: {cliente.cpf || "Não informado"}</p>
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

          {/* Modal de Edição de Cliente */}
          {mostrarModalEdicao && clienteEditando && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">✏️ Editar Cliente</h3>
                  <button
                    onClick={() => {
                      setMostrarModalEdicao(false);
                      setClienteEditando(null);
                    }}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleAtualizarCliente}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        value={clienteEditando.nome}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, nome: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CPF</label>
                      <input
                        type="text"
                        value={clienteEditando.cpf}
                        className="w-full bg-gray-600 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
                        disabled
                        title="CPF não pode ser alterado"
                      />
                      <p className="text-xs text-gray-500 mt-1">CPF não pode ser alterado</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Telefone (WhatsApp)</label>
                      <input
                        type="tel"
                        value={clienteEditando.telefone}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, telefone: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={clienteEditando.email || ""}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, email: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={clienteEditando.cidade}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, cidade: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Estado</label>
                      <input
                        type="text"
                        value={clienteEditando.estado}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, estado: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Rua</label>
                      <input
                        type="text"
                        value={clienteEditando.rua}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, rua: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Número</label>
                      <input
                        type="text"
                        value={clienteEditando.numero}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, numero: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={clienteEditando.bairro}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, bairro: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CEP</label>
                      <input
                        type="text"
                        value={clienteEditando.cep || ""}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, cep: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={clienteEditando.complemento || ""}
                        onChange={(e) => setClienteEditando({ ...clienteEditando, complemento: e.target.value })}
                        className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarModalEdicao(false);
                        setClienteEditando(null);
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-semibold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {loading ? "Salvando..." : "💾 Salvar Alterações"}
                    </button>
                  </div>
                </form>
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
                        // Validar CPF em tempo real quando tiver 14 caracteres (formato completo)
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

