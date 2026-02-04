"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../config/api";
// Header is provided by the global layout; do not import Header/Sidebar here to avoid duplicate header and unused-import warnings.

import Button from "../components/Button";
import Sidebar from "../components/Sidebar";

// Tipos
interface UserData {
  id: string;
  login: string;
  role: string;
  name?: string;
}

interface Categoria {
  _id: string;
  name: string;
  descricao?: string;
  ativo: boolean;
  createdAt: string;
}

interface Produto {
  _id: string;
  name: string;
  preco: number;
  categoria: Categoria | string;
  descricao: string;
  imagem?: string;
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

type TabType =
  | "dashboard"
  | "pedidos"
  | "vendedores"
  | "produtos"
  | "clientes"
  | "trajetos"
  | "novoVendedor"
  | "novoProduto"
  | "cupons"
  | "novoCupom"
  | "novoCliente"
  | "categorias"
  | "novaCategoria";

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

  // Trajetos - novo estado para criação rápida
  const [showNovoTrajeto, setShowNovoTrajeto] = useState(false);
  const [novoTrajeto, setNovoTrajeto] = useState({ nomeCliente: "", cidade: "", estado: "", rua: "", bairro: "", cep: "", dataVisita: "", vendedorId: "" });
  const [editTrajetoId, setEditTrajetoId] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const lookupCep = async (cepRaw: string) => {
    const cep = (cepRaw || '').toString().replace(/\D/g, '');
    if (cep.length !== 8) {
      setCepError('CEP deve ter 8 dígitos');
      return;
    }
    setCepError(null);
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) {
        setCepError('Erro ao consultar CEP');
        return;
      }
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
        return;
      }
      setNovoTrajeto(s => ({
        ...s,
        cidade: data.localidade || s.cidade,
        estado: data.uf || s.estado,
        rua: s.rua || data.logradouro || s.rua,
        bairro: s.bairro || data.bairro || s.bairro,
      }));
    } catch (err) {
      console.error('Erro lookup CEP:', err);
      setCepError('Erro ao validar CEP');
    } finally {
      setCepLoading(false);
    }
  };

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
  const [editVendedorId, setEditVendedorId] = useState<string | null>(null);

  const [novoProduto, setNovoProduto] = useState({
    name: "",
    descricao: "",
    // armazenamos como string durante a edição para evitar prefixo 0 indesejado
    preco: "",
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

  const [novaCategoria, setNovaCategoria] = useState({ name: "", descricao: "" });

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
  const [editClienteId, setEditClienteId] = useState<string | null>(null);

  const [erroValidacaoCPF, setErroValidacaoCPF] = useState<string | null>(null);
  // Estado para visualizar detalhes de um pedido (modal)
  // usamos `any` aqui para evitar conflitos com tipos do frontend; pode ser tipado melhor mais tarde
  const [viewingPedido, setViewingPedido] = useState<any | null>(null);
  // loading para ação de aceitar pedido
  const [acceptLoading, setAcceptLoading] = useState(false);
  const handleCloseViewingPedido = () => setViewingPedido(null);

  const [editProdutoId, setEditProdutoId] = useState<string | null>(null);
  const [editProdutoData, setEditProdutoData] = useState<Produto | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
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

  useEffect(() => {
    if (userData) fetchAllData();
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

  const fetchPedidos = async () => {
    try {
      const response = await fetch(`${API_URL}/pedidos`, { headers: getAuthHeaders() });
      if (response.ok) setPedidos(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrajetos = async () => {
    try {
      const response = await fetch(`${API_URL}/trajetos`, { headers: getAuthHeaders() });
      if (response.ok) setTrajetos(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await fetch(`${API_URL}/clientes`, { headers: getAuthHeaders() });
      if (response.ok) setClientes(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProdutos = async () => {
    try {
      const response = await fetch(`${API_URL}/produtos`, { headers: getAuthHeaders() });
      if (response.ok) setProdutos(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendedores = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
      if (response.ok) setVendedores((await response.json()).filter((u: Vendedor) => u.role === "vendedor"));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCupons = async () => {
    try {
      const response = await fetch(`${API_URL}/cupons`, { headers: getAuthHeaders() });
      if (response.ok) setCupons(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch(`${API_URL}/categorias`, { headers: getAuthHeaders() });
      if (response.ok) setCategorias(await response.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Helpers e handlers (únicos, sem duplicação)
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
      } else setMessage({ type: "error", text: "Erro ao atualizar pedido" });
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    }
  };

  const handleCriarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    // Se estivermos em modo de edição, atualiza via PUT
    if (editVendedorId) {
      try {
        // se senha informada, checar confirmação
        if (novoVendedor.password && novoVendedor.password !== novoVendedor.confirmPassword) {
          setMessage({ type: 'error', text: 'As senhas não coincidem' });
          setLoading(false);
          return;
        }
        const payload: any = {
          name: novoVendedor.name,
          login: novoVendedor.login,
          email: novoVendedor.email,
          telefone: novoVendedor.telefone,
          endereco: novoVendedor.endereco,
          dataNascimento: novoVendedor.dataNascimento || undefined,
        };
        if (novoVendedor.password) payload.password = novoVendedor.password;

        const response = await fetch(`${API_URL}/users/${editVendedorId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Vendedor atualizado com sucesso!' });
          setNovoVendedor({ name: '', login: '', email: '', telefone: '', endereco: '', dataNascimento: '', password: '', confirmPassword: '' });
          setEditVendedorId(null);
          fetchVendedores();
          setActiveTab('vendedores');
        } else {
          const error = await response.json();
          setMessage({ type: 'error', text: error.error || 'Erro ao atualizar vendedor' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
      } finally {
        setLoading(false);
      }
      return;
    }

    // modo criação
    if (novoVendedor.password !== novoVendedor.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      setLoading(false);
      return;
    }
    try {
      const payload: any = {
        name: novoVendedor.name,
        login: novoVendedor.login,
        email: novoVendedor.email,
        telefone: novoVendedor.telefone,
        endereco: novoVendedor.endereco,
        dataNascimento: novoVendedor.dataNascimento || undefined,
        password: novoVendedor.password,
        role: 'vendedor'
      };

      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Vendedor cadastrado com sucesso!' });
        setNovoVendedor({ name: '', login: '', email: '', telefone: '', endereco: '', dataNascimento: '', password: '', confirmPassword: '' });
        fetchVendedores();
        setActiveTab('vendedores');
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erro ao cadastrar vendedor' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulário de vendedor pré-preenchido para edição
  const handleEditarVendedor = (v: Vendedor) => {
    setNovoVendedor({
      name: v.name || '',
      login: (v as any).login || '',
      email: v.email || '',
      telefone: v.telefone || '',
      endereco: (v as any).endereco || '',
      dataNascimento: (v as any).dataNascimento || '',
      password: '',
      confirmPassword: '',
    });
    setEditVendedorId(v._id);
    setActiveTab('novoVendedor');
  };

  const handleAbrirEditarProduto = (produto: Produto) => {
    // Preenche o formulário de criação com os dados do produto e abre a aba de criação/edição
    setEditProdutoId(produto._id);
    setNovoProduto({
      name: produto.name || '',
      descricao: produto.descricao || '',
      preco: produto.preco != null ? String(produto.preco) : '',
      categoria: typeof produto.categoria === 'object' ? (produto.categoria as any)._id : (produto.categoria as string) || '',
    });
    setActiveTab('novoProduto');
  };

  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload: any = { ...novoProduto, preco: Number(novoProduto.preco || 0) };
      // Se estivermos em edição, faz PUT
      if (editProdutoId) {
        const response = await fetch(`${API_URL}/produtos/${editProdutoId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Produto atualizado com sucesso!' });
          setNovoProduto({ name: '', descricao: '', preco: '', categoria: '' });
          setEditProdutoId(null);
          fetchProdutos();
          setActiveTab('produtos');
        } else {
          const error = await response.json();
          setMessage({ type: 'error', text: error.error || 'Erro ao atualizar produto' });
        }
      } else {
        const response = await fetch(`${API_URL}/produtos`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Produto cadastrado com sucesso!' });
          setNovoProduto({ name: '', descricao: '', preco: '', categoria: '' });
          fetchProdutos();
          setActiveTab('produtos');
        } else {
          const error = await response.json();
          setMessage({ type: 'error', text: error.error || 'Erro ao cadastrar produto' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletarVendedor = async (vendedorId: string) => {
    if (!confirm("Tem certeza que deseja excluir este vendedor?")) return;
    try {
      const response = await fetch(`${API_URL}/users/${vendedorId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (response.ok) { setMessage({ type: "success", text: "Vendedor excluído com sucesso!" }); fetchVendedores(); } else setMessage({ type: "error", text: "Erro ao excluir vendedor" });
    } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); }
  };

  const handleDeletarProduto = async (produtoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      const response = await fetch(`${API_URL}/produtos/${produtoId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (response.ok) { setMessage({ type: "success", text: "Produto excluído com sucesso!" }); fetchProdutos(); } else setMessage({ type: "error", text: "Erro ao excluir produto" });
    } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); }
  };

  const handleToggleCupom = async (cupomId: string, ativo: boolean) => {
    try {
      const endpoint = ativo ? "desativar" : "ativar";
      const response = await fetch(`${API_URL}/cupons/${cupomId}/${endpoint}`, { method: "PUT", headers: getAuthHeaders() });
      if (response.ok) { setMessage({ type: "success", text: `Cupom ${ativo ? "desativado" : "ativado"} com sucesso!` }); fetchCupons(); } else setMessage({ type: "error", text: "Erro ao atualizar cupom" });
    } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); }
  };

  const handleDeletarCupom = async (cupomId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    try {
      const response = await fetch(`${API_URL}/cupons/${cupomId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (response.ok) { setMessage({ type: "success", text: "Cupom excluído com sucesso!" }); fetchCupons(); } else setMessage({ type: "error", text: "Erro ao excluir cupom" });
    } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); }
  };

  const handleCriarTrajeto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // helper: converte DD/MM/YYYY para YYYY-MM-DD. Retorna null se formato inválido.
    const parseDateToISO = (dateStr: string) => {
      if (!dateStr) return null;
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) return dateStr; // já no formato ISO
      const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (brMatch) {
        const [, dd, mm, yyyy] = brMatch;
        return `${yyyy}-${mm}-${dd}`;
      }
      return null;
    };

    try {
      const payload: any = { ...novoTrajeto };
      // Se admin estiver criando, obrigar seleção de vendedor responsável
      if (userData?.role === 'admin') {
        if (!novoTrajeto.vendedorId) {
          setMessage({ type: 'error', text: 'Selecione o vendedor responsável pelo trajeto.' });
          setLoading(false);
          return;
        }
        payload.vendedorId = novoTrajeto.vendedorId;
      } else {
        payload.vendedorId = userData?.id;
      }

      if (novoTrajeto.dataVisita) {
        const iso = parseDateToISO(novoTrajeto.dataVisita);
        if (!iso) {
          setMessage({ type: 'error', text: 'Formato de data inválido. Use o campo de calendário.' });
          setLoading(false);
          return;
        }
        payload.dataVisita = iso;
      }

      let response;
      if (editTrajetoId) {
        // edição
        response = await fetch(`${API_URL}/trajeto/${editTrajetoId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Trajeto atualizado com sucesso!' });
          setEditTrajetoId(null);
        } else {
          const err = await response.json().catch(() => ({}));
          setMessage({ type: 'error', text: err.error || 'Erro ao atualizar trajeto' });
        }
      } else {
        // criação
        response = await fetch(`${API_URL}/trajeto`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Trajeto criado com sucesso!' });
        } else {
          const err = await response.json().catch(() => ({}));
          setMessage({ type: 'error', text: err.error || 'Erro ao criar trajeto' });
        }
      }

      if (response && response.ok) {
        setNovoTrajeto({ nomeCliente: '', cidade: '', estado: '', rua: '', bairro: '', cep: '', dataVisita: '', vendedorId: '' });
        setShowNovoTrajeto(false);
        fetchTrajetos();
      }
    } catch (err) { setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' }); } finally { setLoading(false); }
  };

  const handleEditarTrajeto = (t: Trajeto) => {
    setNovoTrajeto({
      nomeCliente: t.nomeCliente || '',
      cidade: t.cidade || '',
      estado: t.estado || '',
      rua: t.rua || '',
      bairro: t.bairro || '',
      cep: t.cep || '',
      dataVisita: t.dataVisita ? new Date(t.dataVisita).toISOString().split('T')[0] : '',
      vendedorId: (t as any).vendedorId?._id || (t as any).vendedorId || '',
    });
    setEditTrajetoId(t._id);
    setShowNovoTrajeto(true);
    setActiveTab('trajetos');
  };

  const handleDeletarTrajeto = async (trajetoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este trajeto?")) return;
    try {
      const response = await fetch(`${API_URL}/trajeto/${trajetoId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (response.ok) { setMessage({ type: "success", text: "Trajeto excluído com sucesso!" }); fetchTrajetos(); } else setMessage({ type: "error", text: "Erro ao excluir trajeto" });
    } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); }
  };

  const formatarCPF = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    return numeros.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2").substring(0, 14);
  };

  const validarCPF = (cpf: string): boolean => {
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpfLimpo)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
    return true;
  };

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    if (!validarCPF(novoCliente.cpf)) { setMessage({ type: 'error', text: 'CPF inválido! Por favor, verifique o número.' }); setLoading(false); return; }
    try {
      const payload = { ...novoCliente, cpf: novoCliente.cpf.replace(/\D/g, '') };
      if (editClienteId) {
        // Edição
        const response = await fetch(`${API_URL}/clientes/${editClienteId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Cliente atualizado com sucesso!' });
          setNovoCliente({ nome: '', cpf: '', email: '', telefone: '', cidade: '', estado: '', rua: '', numero: '', bairro: '', cep: '', complemento: '' });
          setEditClienteId(null);
          setErroValidacaoCPF(null);
          fetchClientes();
          setActiveTab('clientes');
        } else {
          const error = await response.json();
          setMessage({ type: 'error', text: error.error || 'Erro ao atualizar cliente' });
        }
      } else {
        // Criação
        const response = await fetch(`${API_URL}/clientes`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...payload, vendedorId: userData?.id }) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Cliente cadastrado com sucesso!' });
          setNovoCliente({ nome: '', cpf: '', email: '', telefone: '', cidade: '', estado: '', rua: '', numero: '', bairro: '', cep: '', complemento: '' });
          setErroValidacaoCPF(null);
          fetchClientes();
          setActiveTab('clientes');
        } else {
          const error = await response.json();
          setMessage({ type: 'error', text: error.error || 'Erro ao cadastrar cliente' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditarCliente = (c: Cliente) => {
    const clienteAny = c as any;
    setNovoCliente({
      nome: clienteAny.nome || '',
      cpf: clienteAny.cpf || '',
      email: clienteAny.email || '',
      telefone: clienteAny.telefone || '',
      cidade: clienteAny.cidade || '',
      estado: clienteAny.estado || '',
      rua: clienteAny.rua || '',
      numero: clienteAny.numero || '',
      bairro: clienteAny.bairro || '',
      cep: clienteAny.cep || '',
      complemento: clienteAny.complemento || '',
    });
    setEditClienteId(c._id);
    setActiveTab('novoCliente');
  };

  const handleCriarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/cupons`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ codigo: novoCupom.codigo, desconto: novoCupom.desconto, valorMinimo: novoCupom.valorMinimo || 0, dataValidade: novoCupom.dataValidade || null, usoMaximo: novoCupom.usoMaximo ? parseInt(String(novoCupom.usoMaximo)) : null, criadoPor: userData?.id, notificarClientes: novoCupom.notificarClientes }) });
      if (response.ok) { setMessage({ type: "success", text: "Cupom criado com sucesso! Clientes serão notificados através do Email cadastrado." }); setNovoCupom({ codigo: "", desconto: 10, valorMinimo: 0, dataValidade: "", usoMaximo: "", notificarClientes: true }); fetchCupons(); setActiveTab("cupons"); } else { const error = await response.json(); setMessage({ type: "error", text: error.error || "Erro ao criar cupom" }); }
    } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); } finally { setLoading(false); }
  };

  const handleToggleCategoria = async (categoriaId: string, ativo: boolean) => {
    try {
      const response = await fetch(`${API_URL}/categorias/${categoriaId}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ ativo: !ativo }) });
      if (response.ok) { setMessage({ type: "success", text: `Categoria ${ativo ? "desativada" : "ativada"} com sucesso!` }); fetchCategorias(); } else setMessage({ type: "error", text: "Erro ao atualizar categoria" });
    } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); }
  };

  const handleDeletarCategoria = async (categoriaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Produtos vinculados podem ser afetados.")) return;
    try { const response = await fetch(`${API_URL}/categorias/${categoriaId}`, { method: "DELETE", headers: getAuthHeaders() }); if (response.ok) { setMessage({ type: "success", text: "Categoria excluída com sucesso!" }); fetchCategorias(); } else setMessage({ type: "error", text: "Erro ao excluir categoria" }); } catch (err) { setMessage({ type: "error", text: "Erro ao conectar com o servidor" }); }
  };

  const handleLogout = () => { localStorage.removeItem("token"); router.push("/"); };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendente":
        return "bg-yellow-500";
      case "Em Progresso":
      case "Em Andamento":
        return "bg-blue-500";
      case "Em Trânsito":
        return "bg-indigo-500";
      case "Concluído":
        return "bg-green-500";
      case "Cancelado":
        return "bg-red-500";
      case "Aguardando Pagamento":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  // Filtragem
  const pedidosAtivos = pedidos.filter((p) => p.status !== "Cancelado");
  const pedidosNaoCancelados = pedidosAtivos;
  const pedidosPendentes = pedidosNaoCancelados.filter((p) => p.status === "Pendente").length;
  const pedidosEmProgresso = pedidosNaoCancelados.filter((p) => p.status === "Em Progresso").length;
  const pedidosConcluidos = pedidosNaoCancelados.filter((p) => p.status === "Concluído").length;
  const faturamentoTotal = pedidosNaoCancelados.filter((p) => p.status === "Concluído").reduce((acc, p) => acc + (p.preco || 0), 0);

  if (!userData) return (
    <div className="flex items-center justify-center min-h-screen bg-app text-app"><div className="text-app text-xl">Carregando...</div></div>
  );

  return (
    <div className="min-h-screen bg-app text-app">
      <div className="container-responsive grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-3"><div className="sticky top-6"><Sidebar active={activeTab} onChange={(t: TabType) => setActiveTab(t)} /></div></div>
        <div className="lg:col-span-9">
          <main className="space-y-6 p-4">
            {message && <div className={`mb-4 p-4 rounded-lg ${message.type === "success" ? "bg-green-700/30" : "bg-red-700/30"}`}>{message.text}</div>}
            <section>
              <h2 className="text-3xl font-bold mb-4 kv-accent">Painel Administrativo</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'var(--accent)' }}>
                  <h3 className="text-lg kv-muted">Pedidos Pendentes</h3>
                  <p className="text-4xl font-bold kv-accent">{pedidosPendentes}</p>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'var(--accent-2)' }}>
                  <h3 className="text-lg kv-muted">Em Progresso</h3>
                  <p className="text-4xl font-bold kv-accent">{pedidosEmProgresso}</p>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'rgba(34,197,94,0.8)' }}>
                  <h3 className="text-lg kv-muted">Concluídos</h3>
                  <p className="text-4xl font-bold text-success">{pedidosConcluidos}</p>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'var(--accent-2)' }}>
                  <h3 className="text-lg kv-muted">Faturamento</h3>
                  <p className="text-3xl font-bold kv-accent">R$ {faturamentoTotal.toFixed(2)}</p>
                </div>
              </div>
            </section>

            <section>
              {/* abas: mostrar apenas pedidos como antes */}
              {activeTab === 'pedidos' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold kv-accent mb-4">Todos os Pedidos</h3>
                  {pedidosAtivos.length > 0 && (
                    <div className="bg-card p-6 rounded mb-4">
                      <h4 className="text-lg font-semibold kv-accent mb-2">Últimos Pedidos</h4>
                      <div className="space-y-2">
                        {pedidosAtivos.slice(0,5).map(p => (
                          <div key={p._id} className="flex items-center justify-between border-b border-white/6 py-2">
                            <div>
                              <p className="font-medium text-app">{p.nomeCliente}</p>
                              <p className="text-sm kv-muted">{p.produtoId?.name || 'Produto'} • R$ {p.preco?.toFixed(2)}</p>
                            </div>
                            <div className="text-sm badge-gold">{p.status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pedidosAtivos.length === 0 ? (
                    <div className="bg-card p-6 rounded">Nenhum pedido encontrado.</div>
                  ) : (
                    <div className="bg-card p-4 rounded space-y-2">
                      {pedidosAtivos.map(p => (
                        <div key={p._id} className="flex items-center justify-between p-3 border-b border-white/6">
                          <div>
                            <div className="font-medium">{p.nomeCliente}</div>
                            <div className="text-sm kv-muted">{p.produtoId?.name || 'Produto'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm kv-muted">R$ {p.preco?.toFixed(2)}</div>
                            {p.status === 'Pendente' ? (
                              <div className="flex items-center gap-2">
                                <Button variant="gold" onClick={() => setViewingPedido(p)}>Visualizar</Button>
                                <Button variant="ghost" onClick={() => { if (confirm('Deseja recusar e cancelar este pedido?')) handleUpdatePedidoStatus(p._id, 'Cancelado'); }}>Recusar</Button>
                              </div>
                            ) : (
                                 <select className="input-gold text-sm text-app bg-card appearance-none px-2 py-1 rounded" value={p.status} onChange={(e) => { const novo = e.target.value; if (novo === 'Cancelado' && !confirm('Confirma cancelar este pedido?')) return; handleUpdatePedidoStatus(p._id, novo); }}>
                                   <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                                   <option value="Pendente">Pendente</option>
                                   <option value="Em Progresso">Em Progresso</option>
                                   <option value="Em Trânsito">Em Trânsito</option>
                                   <option value="Concluído">Concluído</option>
                                   <option value="Cancelado">Cancelado</option>
                                 </select>
                               )}
                           </div>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'vendedores' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold kv-accent">Vendedores</h3>
                    <Button variant="gold" onClick={() => setActiveTab('novoVendedor')}>+ Novo Vendedor</Button>
                  </div>
                  <div className="bg-card p-4 rounded space-y-2">
                    {vendedores.map(v => (
                      <div key={v._id} className="flex items-center justify-between p-3 border-b border-white/6">
                        <div>
                          <div className="font-medium">{v.name}</div>
                          <div className="text-sm kv-muted">{v.login} • {v.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => handleEditarVendedor(v)}>Editar</Button>
                          <Button variant="primary" onClick={() => handleDeletarVendedor(v._id)}>Excluir</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'produtos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold kv-accent">Produtos</h3>
                    <Button variant="gold" onClick={() => setActiveTab('novoProduto')}>+ Novo Produto</Button>
                  </div>
                  <div className="bg-card p-4 rounded space-y-2">
                    {produtos.map(prod => (
                      <div key={prod._id} className="flex items-center justify-between p-3 border-b border-white/6">
                        <div className="flex items-center gap-4">
                          {prod.imagem && <img src={getImageUrl(prod.imagem) || ''} alt="" className="w-12 h-12 object-cover rounded" />}
                          <div>
                            <div className="font-medium">{prod.name}</div>
                            <div className="text-sm kv-muted">R$ {prod.preco?.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => handleAbrirEditarProduto(prod)}>Editar</Button>
                          <Button variant="primary" onClick={() => handleDeletarProduto(prod._id)}>Excluir</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'clientes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold kv-accent">Clientes</h3>
                    <Button variant="gold" onClick={() => setActiveTab('novoCliente')}>+ Novo Cliente</Button>
                  </div>
                  <div className="bg-card p-4 rounded space-y-2">
                    {clientes.map(c => (
                      <div key={c._id} className="flex items-center justify-between p-3 border-b border-white/6">
                        <div>
                          <div className="font-medium">{c.nome}</div>
                          <div className="text-sm kv-muted">{c.email} • {c.telefone}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => handleEditarCliente(c)}>Editar</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'trajetos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold kv-accent">Trajetos</h3>
                    <div className="flex gap-2">
                      <Button variant="gold" onClick={() => setShowNovoTrajeto(s => !s)}>{showNovoTrajeto ? 'Fechar' : '+ Novo Trajeto'}</Button>
                    </div>
                  </div>

                  {showNovoTrajeto && (
                    <div className="bg-card p-4 rounded">
                      {/* Formulário com md:grid-cols-3 para permitir campos largos */}
                      <form onSubmit={handleCriarTrajeto} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input className="input-gold md:col-span-2" placeholder="Nome do Cliente" value={novoTrajeto.nomeCliente} onChange={e => setNovoTrajeto(s => ({ ...s, nomeCliente: e.target.value }))} />
                        <input className="input-gold" placeholder="Cidade" value={novoTrajeto.cidade} onChange={e => setNovoTrajeto(s => ({ ...s, cidade: e.target.value }))} />
                        <input className="input-gold" placeholder="Estado" value={novoTrajeto.estado} onChange={e => setNovoTrajeto(s => ({ ...s, estado: e.target.value }))} />
                        <input className="input-gold md:col-span-2" placeholder="Rua" value={novoTrajeto.rua} onChange={e => setNovoTrajeto(s => ({ ...s, rua: e.target.value }))} />
                        <input className="input-gold" placeholder="Bairro" value={novoTrajeto.bairro} onChange={e => setNovoTrajeto(s => ({ ...s, bairro: e.target.value }))} />
                        <input className="input-gold" placeholder="CEP" value={novoTrajeto.cep} onChange={e => {
                          const v = e.target.value;
                          setNovoTrajeto(s => ({ ...s, cep: v }));
                          const digits = v.replace(/\D/g, '');
                          if (digits.length === 8) lookupCep(v);
                        }} />
                        {cepLoading && <div className="text-sm kv-muted mt-1">Buscando CEP...</div>}
                        {cepError && <div className="text-sm text-red-400 mt-1">{cepError}</div>}
                        {/* Para admins: selecionar vendedor responsável pelo trajeto */}
                        {userData?.role === 'admin' && (
                          <div>
                            <label className="text-sm text-white mb-1 block">Vendedor responsável</label>
                            <select className="input-gold" value={novoTrajeto.vendedorId} onChange={e => setNovoTrajeto(s => ({ ...s, vendedorId: e.target.value }))}>
                              <option value="">Selecione vendedor</option>
                              {vendedores.map(v => <option key={v._id} value={v._id}>{v.name} ({v.login})</option>)}
                            </select>
                            <div className="text-xs kv-muted mt-1">Selecione o vendedor responsável por esta rota</div>
                          </div>
                        )}
                        <div>
                          <label className="text-sm text-white mb-1 block">Data Visita</label>
                          <input className="input-gold" type="date" value={novoTrajeto.dataVisita} onChange={e => setNovoTrajeto(s => ({ ...s, dataVisita: e.target.value }))} />
                          <div className="text-xs kv-muted mt-1">Informe a data da visita (DD/MM/AAAA)</div>
                        </div>
                        <div className="col-span-full md:col-span-3 flex gap-2">
                          <Button variant="gold" type="submit">{editTrajetoId ? 'Salvar' : 'Criar Trajeto'}</Button>
                          <Button variant="ghost" onClick={() => { setShowNovoTrajeto(false); setEditTrajetoId(null); setNovoTrajeto({ nomeCliente: '', cidade: '', estado: '', rua: '', bairro: '', cep: '', dataVisita: '', vendedorId: '' }); }}>Cancelar</Button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="bg-card p-4 rounded space-y-2">
                    {trajetos.map(t => {
                      const ownerId = (t as any).vendedorId?._id || (t as any).vendedorId;
                      const canManage = userData?.role === 'admin' || (userData?.role === 'vendedor' && String(ownerId) === String(userData.id));
                      return (
                        <div key={t._id} className="flex items-center justify-between p-3 border-b border-white/6">
                          <div>
                            <div className="font-medium">{t.nomeCliente}</div>
                            <div className="text-sm kv-muted">{t.cidade} - {t.estado}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm kv-muted">{new Date(t.createdAt).toLocaleDateString()}</div>
                            {canManage && <Button variant="ghost" onClick={() => handleEditarTrajeto(t)}>Editar</Button>}
                            {canManage && <Button variant="primary" onClick={() => { if (confirm('Tem certeza que deseja excluir este trajeto?')) handleDeletarTrajeto(t._id); }}>Excluir</Button>}
                          </div>
                        </div>
                      );
                    })}
                   </div>
                </div>
              )}

              {activeTab === 'cupons' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold kv-accent">Cupons</h3>
                    <Button variant="gold" onClick={() => setActiveTab('novoCupom')}>+ Novo Cupom</Button>
                  </div>
                  <div className="bg-card p-4 rounded space-y-2">{cupons.map(cp => (
                    <div key={cp._id} className="flex items-center justify-between p-3 border-b border-white/6">
                      <div>
                        <div className="font-medium">{cp.codigo} — {cp.desconto}%</div>
                        <div className="text-sm kv-muted">Mínimo R$ {cp.valorMinimo.toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => handleToggleCupom(cp._id, cp.ativo)}>{cp.ativo ? 'Desativar' : 'Ativar'}</Button>
                        <Button variant="primary" onClick={() => handleDeletarCupom(cp._id)}>Excluir</Button>
                      </div>
                    </div>
                  ))}</div>
                </div>
              )}

              {activeTab === 'categorias' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold kv-accent">Categorias</h3>
                    <Button variant="gold" onClick={() => setActiveTab('novaCategoria')}>+ Nova Categoria</Button>
                  </div>
                  <div className="bg-card p-4 rounded space-y-2">{categorias.map(cat => (
                    <div key={cat._id} className="flex items-center justify-between p-3 border-b border-white/6">
                      <div>
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-sm kv-muted">{cat.descricao}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => handleToggleCategoria(cat._id, cat.ativo)}>{cat.ativo ? 'Desativar' : 'Ativar'}</Button>
                        <Button variant="primary" onClick={() => handleDeletarCategoria(cat._id)}>Excluir</Button>
                      </div>
                    </div>
                  ))}</div>
                </div>
              )}

              {/* Formulários de criação rápida (novoVendedor, novoProduto, novoCliente, novoCupom, novaCategoria) */}

              {activeTab === 'novoVendedor' && (
                <div className="bg-card p-4 rounded mb-4">
                  <form onSubmit={handleCriarVendedor} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="input-gold" placeholder="Nome" value={novoVendedor.name} onChange={e => setNovoVendedor(s => ({ ...s, name: e.target.value }))} />
                    <input className="input-gold" placeholder="Login" value={novoVendedor.login} onChange={e => setNovoVendedor(s => ({ ...s, login: e.target.value }))} />
                    <input className="input-gold" placeholder="Email" value={novoVendedor.email} onChange={e => setNovoVendedor(s => ({ ...s, email: e.target.value }))} />
                    <input className="input-gold" placeholder="Telefone" value={novoVendedor.telefone} onChange={e => setNovoVendedor(s => ({ ...s, telefone: e.target.value }))} />
                    <div>
                      <label className="text-sm text-white mb-1 block">Data de Nascimento</label>
                      <input className="input-gold" type="date" value={novoVendedor.dataNascimento} onChange={e => setNovoVendedor(s => ({ ...s, dataNascimento: e.target.value }))} />
                      <div className="text-xs kv-muted mt-1">Informe a data de nascimento do vendedor (DD/MM/AAAA)</div>
                    </div>
                    <input className="input-gold" placeholder="Senha (deixe em branco para manter)" type="password" value={novoVendedor.password} onChange={e => setNovoVendedor(s => ({ ...s, password: e.target.value }))} />
                    <input className="input-gold" placeholder="Confirmar Senha" type="password" value={novoVendedor.confirmPassword} onChange={e => setNovoVendedor(s => ({ ...s, confirmPassword: e.target.value }))} />
                    <div className="col-span-full flex gap-2"><Button variant="gold" type="submit">{editVendedorId ? 'Salvar' : 'Criar'}</Button><Button variant="ghost" onClick={() => { setActiveTab('vendedores'); setEditVendedorId(null); setNovoVendedor({ name: '', login: '', email: '', telefone: '', endereco: '', dataNascimento: '', password: '', confirmPassword: '' }); }}>Cancelar</Button></div>
                  </form>
                </div>
              )}

              {activeTab === 'novoProduto' && (
                <div className="bg-card p-6 rounded">
                  <h3 className="text-xl font-semibold kv-accent mb-4">{editProdutoId ? 'Editar Produto' : 'Criar Produto'}</h3>
                  <form onSubmit={handleCriarProduto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Nome do produto</div>
                      <input className="input-gold" placeholder="Ex: Camisa Polo - Tamanho M" value={novoProduto.name} onChange={e => setNovoProduto(s => ({ ...s, name: e.target.value }))} />
                    </label>
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Preço (R$)</div>
                      <input className="input-gold" placeholder="Ex: 79.90" type="number" step="0.01" value={novoProduto.preco} onChange={e => { let v = e.target.value; if (v.length > 1 && v.startsWith('0') && !v.startsWith('0.')) { v = v.replace(/^0+/, ''); if (v === '') v = '0'; } setNovoProduto(s => ({ ...s, preco: v })); }} />
                    </label>
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Categoria</div>
                      <select className="input-gold text-sm text-app bg-card appearance-none px-2 py-1 rounded" value={novoProduto.categoria} onChange={e => setNovoProduto(s => ({ ...s, categoria: e.target.value }))}>
                        <option value="">Selecione categoria</option>
                        {categorias.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </label>

                    {/* Descrição posicionada à direita da categoria em telas md+ */}
                    <label className="block md:col-span-1 md:col-start-2">
                      <div className="text-sm kv-muted mb-1">Descrição</div>
                      <textarea rows={4} className="input-gold w-full min-h-[5.5rem] resize-y" placeholder="Breve descrição do produto, materiais, observações de tamanho, etc." value={novoProduto.descricao} onChange={e => setNovoProduto(s => ({ ...s, descricao: e.target.value }))} />
                    </label>

                    <div className="col-span-full flex gap-2"><Button variant="gold" type="submit">{editProdutoId ? 'Salvar' : 'Criar'}</Button><Button variant="ghost" onClick={() => { setActiveTab('produtos'); setEditProdutoId(null); setNovoProduto({ name: '', descricao: '', preco: '', categoria: '' }); }}>Cancelar</Button></div>
                  </form>
                </div>
              )}

              {activeTab === 'novoCliente' && (
                <div className="bg-card p-6 rounded">
                  <h3 className="text-xl font-semibold kv-accent mb-4">{editClienteId ? 'Editar Cliente' : 'Criar Cliente'}</h3>
                  <form onSubmit={handleCriarCliente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="input-gold" placeholder="Nome" value={novoCliente.nome} onChange={e => setNovoCliente(s => ({ ...s, nome: e.target.value }))} />
                    <input className="input-gold" placeholder="CPF" value={novoCliente.cpf} onChange={e => setNovoCliente(s => ({ ...s, cpf: e.target.value }))} />
                    <input className="input-gold" placeholder="Email" value={novoCliente.email} onChange={e => setNovoCliente(s => ({ ...s, email: e.target.value }))} />
                    <input className="input-gold" placeholder="Telefone" value={novoCliente.telefone} onChange={e => setNovoCliente(s => ({ ...s, telefone: e.target.value }))} />
                    <div className="col-span-full flex gap-2"><Button variant="gold" type="submit">{editClienteId ? 'Salvar' : 'Criar'}</Button><Button variant="ghost" onClick={() => { setActiveTab('clientes'); setEditClienteId(null); setNovoCliente({ nome: '', cpf: '', email: '', telefone: '', cidade: '', estado: '', rua: '', numero: '', bairro: '', cep: '', complemento: '' }); }}>Cancelar</Button></div>
                  </form>
                </div>
              )}

              {activeTab === 'novoCupom' && (
                <div className="bg-card p-6 rounded">
                  <h3 className="text-xl font-semibold kv-accent mb-4">Criar Cupom</h3>
                  <form onSubmit={handleCriarCupom} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Código do cupom</div>
                      <input className="input-gold" placeholder="Ex: BOASVINDAS10" value={novoCupom.codigo} onChange={e => setNovoCupom(s => ({ ...s, codigo: e.target.value }))} />
                    </label>
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Desconto (%)</div>
                      <input className="input-gold" placeholder="Ex: 10" type="number" value={novoCupom.desconto} onChange={e => setNovoCupom(s => ({ ...s, desconto: Number(e.target.value) }))} />
                    </label>
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Valor mínimo (R$)</div>
                      <input className="input-gold" placeholder="Ex: 100" type="number" value={novoCupom.valorMinimo} onChange={e => setNovoCupom(s => ({ ...s, valorMinimo: Number(e.target.value) }))} />
                    </label>
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Validade (opcional)</div>
                      <input className="input-gold" placeholder="AAAA-MM-DD (opcional)" type="date" value={novoCupom.dataValidade} onChange={e => setNovoCupom(s => ({ ...s, dataValidade: e.target.value }))} />
                    </label>
                    <label className="block">
                      <div className="text-sm kv-muted mb-1">Uso máximo por cupom (opcional)</div>
                      <input className="input-gold" placeholder="Quantidade máxima de usos (deixe em branco para ilimitado)" type="number" value={novoCupom.usoMaximo as any} onChange={e => setNovoCupom(s => ({ ...s, usoMaximo: e.target.value }))} />
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={novoCupom.notificarClientes} onChange={e => setNovoCupom(s => ({ ...s, notificarClientes: e.target.checked }))} />
                      <div className="text-sm kv-muted">Notificar clientes por e-mail quando criado</div>
                    </label>
                    <div className="col-span-full flex gap-2"><Button variant="gold" type="submit">Criar</Button><Button variant="ghost" onClick={() => setActiveTab('cupons')}>Cancelar</Button></div>
                  </form>
                </div>
              )}

              {activeTab === 'novaCategoria' && (
                <div className="bg-card p-6 rounded">
                  <h3 className="text-xl font-semibold kv-accent mb-4">Criar Categoria</h3>
                  <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); setMessage(null); try { const response = await fetch(`${API_URL}/categorias`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(novaCategoria) }); if (response.ok) { setMessage({ type: 'success', text: 'Categoria criada com sucesso!' }); setNovaCategoria({ name: '', descricao: '' }); fetchCategorias(); setActiveTab('categorias'); } else { const err = await response.json(); setMessage({ type: 'error', text: err.error || 'Erro ao criar categoria' }); } } catch (err) { setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' }); } finally { setLoading(false); } }} className="grid grid-cols-1 gap-4">
                    <input className="input-gold" placeholder="Nome" value={novaCategoria.name} onChange={e => setNovaCategoria(s => ({ ...s, name: e.target.value }))} />
                    <textarea className="input-gold" placeholder="Descrição" value={novaCategoria.descricao} onChange={e => setNovaCategoria(s => ({ ...s, descricao: e.target.value }))} />
                    <div className="flex gap-2"><Button variant="gold" type="submit">Criar</Button><Button variant="ghost" onClick={() => setActiveTab('categorias')}>Cancelar</Button></div>
                  </form>
                </div>
              )}

            </section>
          </main>
        </div>
      </div>

      {/* Modal de visualização de pedido */}
      {viewingPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card p-6 rounded w-full max-w-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-semibold">Detalhes do Pedido</h3>
              <button className="text-sm text-white/60" onClick={handleCloseViewingPedido}>Fechar</button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div><strong>Cliente:</strong> {viewingPedido.nomeCliente}</div>
              <div><strong>Preço total:</strong> R$ {viewingPedido.preco?.toFixed(2)}</div>
              <div><strong>Status:</strong> {viewingPedido.status}</div>
              <div>
                <strong>Itens ({(viewingPedido.items?.length as number) || 0}):</strong>
                <div className="mt-2 space-y-2">
                  {viewingPedido.items?.map((it: any, idx: number) => (
                    <div key={idx} className="p-2 border rounded">
                      <div className="font-medium">{(it as any).produtoId?.name || 'Produto'}</div>
                      <div className="text-xs kv-muted">Tamanho: {it.tamanho} • Quantidade: {it.quantidade} • Preço unit.: R$ {(it.precoUnitario || 0).toFixed(2)}</div>
                      {it.observacoes && <div className="mt-1">Observações: {it.observacoes}</div>}
                      {it.photo && <img src={getImageUrl(it.photo) || it.photo} alt="anexo" className="w-32 h-32 object-cover mt-2 rounded" />}
                    </div>
                  ))}
                </div>
              </div>
              {viewingPedido.observacoes && (<div><strong>Observações gerais:</strong><div className="mt-1">{viewingPedido.observacoes}</div></div>)}
              {viewingPedido.photo && (<div><strong>Anexo:</strong><div className="mt-2"><img src={getImageUrl(viewingPedido.photo) || viewingPedido.photo} alt="anexo" className="w-48 h-48 object-cover rounded" /></div></div>)}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="gold" disabled={acceptLoading} onClick={async () => {
                if (!confirm('Deseja aceitar este pedido?')) return;
                try {
                  setAcceptLoading(true);
                  const response = await fetch(`${API_URL}/pedidos/${viewingPedido._id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status: 'Em Progresso' })
                  });
                  const data = await response.json().catch(() => ({}));
                  if (response.ok) {
                    // atualização retornou pedido com entrega calculada (seok)
                    setViewingPedido(data);
                    setMessage({ type: 'success', text: 'Pedido aceito. Prazo de entrega calculado.' });
                    // atualizar lista
                    fetchPedidos();
                  } else {
                    setMessage({ type: 'error', text: data.error || 'Erro ao aceitar pedido' });
                  }
                } catch (err) {
                  console.error('Erro ao aceitar pedido', err);
                  setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
                } finally {
                  setAcceptLoading(false);
                }
              }}>{acceptLoading ? 'Processando...' : 'Aceitar'}</Button>
              <Button variant="ghost" onClick={async () => {
                if (!confirm('Deseja recusar e cancelar este pedido?')) return;
                try {
                  const response = await fetch(`${API_URL}/pedidos/${viewingPedido._id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status: 'Cancelado' })
                  });
                  const data = await response.json().catch(() => ({}));
                  if (response.ok) {
                    setMessage({ type: 'success', text: 'Pedido cancelado.' });
                    fetchPedidos();
                  } else {
                    setMessage({ type: 'error', text: data.error || 'Erro ao cancelar pedido' });
                  }
                } catch (err) {
                  console.error('Erro ao cancelar pedido', err);
                  setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
                } finally {
                  handleCloseViewingPedido();
                }
              }}>Recusar</Button>
              <Button variant="ghost" onClick={handleCloseViewingPedido}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
