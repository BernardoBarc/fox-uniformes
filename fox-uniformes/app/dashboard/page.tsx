"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../config/api";
import Sidebar from "../components/Sidebar";

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
  categoria: { _id: string; name: string } | string;
  descricao?: string;
  imagem?: string;
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

// Componente ComboBox simples, sem dependências externas — acessível e estilizado com Tailwind
const ComboBox: React.FC<{
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  return (
    <div className="relative" ref={ref}>
      {label && <label className="text-sm text-white mb-1 block">{label}</label>}
      <button
        type="button"
        className={`input-gold w-full text-left ${value ? 'text-white' : 'text-gray-400'}`}
        onClick={() => setOpen(s => !s)}
      >
        {value ? selectedLabel : (placeholder || 'Selecionar')}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-white/6 rounded shadow max-h-48 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm kv-muted">Nenhuma opção</div>
          ) : (
            options.map(opt => (
              <div
                key={opt.value}
                className="px-3 py-2 cursor-pointer hover:bg-white/5 text-white"
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [loading, setLoading] = useState(false);
  // Guard para evitar submissões duplicadas rápidas (double-click)
  const isSubmittingRef = useRef(false);
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
    // entrega removida: a data será definida em outro fluxo posteriormente
  });
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  
  // Estados do carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [itemAtual, setItemAtual] = useState({
    categoria: "",
    produtoId: "",
    tamanho: "",
    quantidade: 1,
    observacoes: "",
  });
  const [fotoItemAtual, setFotoItemAtual] = useState<File | null>(null);
  const [previewFotoAtual, setPreviewFotoAtual] = useState<string | null>(null);

  // Tamanhos disponíveis
  const tamanhosDisponiveis = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'Único'];

  // Função auxiliar para obter nome da categoria
  const getCategoriaName = (categoria: { _id: string; name: string } | string) => {
    if (typeof categoria === 'object' && categoria !== null) {
      return categoria.name;
    }
    return categoria;
  };

  // Função auxiliar para obter ID da categoria
  const getCategoriaId = (categoria: { _id: string; name: string } | string) => {
    if (typeof categoria === 'object' && categoria !== null) {
      return categoria._id;
    }
    return categoria;
  };

  // Produtos filtrados por categoria
  const produtosFiltrados = itemAtual.categoria 
    ? produtos.filter(p => getCategoriaId(p.categoria) === itemAtual.categoria)
    : [];

  // Lista de categorias únicas (extrai o objeto categoria de cada produto)
  const categoriasUnicas = produtos
    .map(p => p.categoria)
    .filter((cat): cat is { _id: string; name: string } => typeof cat === 'object' && cat !== null)
    .filter((cat, index, self) => 
      index === self.findIndex(c => c._id === cat._id)
    );

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
    numero: "",
    pontoReferencia: "",
    dataVisita: "",
  });
  // estado para edição de trajeto
  const [editTrajetoId, setEditTrajetoId] = useState<string | null>(null);

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

  // estados para mostrar formulários rápidos na UI do vendedor
  const [showNovoTrajeto, setShowNovoTrajeto] = useState(false);
  const [showNovoCliente, setShowNovoCliente] = useState(false);

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

    // Requer que um cliente esteja selecionado para validar cupom por cliente
    if (!clienteSelecionado) {
      setErroCupom("Busque/Selecione o cliente antes de validar o cupom");
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
          clienteId: clienteSelecionado._id,
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

    if (!itemAtual.tamanho) {
      setMessage({ type: "error", text: "Selecione um tamanho" });
      return;
    }

    const novoItem: ItemCarrinho = {
      id: Date.now().toString(),
      produtoId: produto._id,
      produtoNome: produto.name,
      categoria: getCategoriaName(produto.categoria),
      tamanho: itemAtual.tamanho,
      quantidade: itemAtual.quantidade,
      precoUnitario: produto.preco,
      precoTotal: produto.preco * itemAtual.quantidade,
      observacoes: itemAtual.observacoes,
      foto: fotoItemAtual || undefined,
      previewFoto: previewFotoAtual || undefined,
    };

    setCarrinho([...carrinho, novoItem]);
    setItemAtual({ categoria: "", produtoId: "", tamanho: "", quantidade: 1, observacoes: "" });
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

  // Função para validar cliente em edição (utilizada no modal)
  const isClienteValido = (c: Cliente | null) => {
    if (!c) return false;
    if (!c.nome || !c.nome.trim()) return false;
    if (!validarCPF(c.cpf || '')) return false;
    if (!c.email || !c.email.includes('@')) return false;
    if (!c.telefone || c.telefone.replace(/\D/g, '').length < 8) return false;
    return true;
  };

  // Função para validar novo cliente (criação rápida)
  const isNovoClienteValido = (c: typeof novoCliente) => {
    if (!c) return false;
    if (!c.nome || !c.nome.trim()) return false;
    if (!validarCPF(c.cpf || '')) return false;
    if (!c.email || !c.email.includes('@')) return false;
    if (!c.telefone || c.telefone.replace(/\D/g, '').length < 8) return false;
    return true;
  };

  // Função para atualizar cliente
  const handleAtualizarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteEditando) return;
    setLoading(true);
    setMessage(null);
    setErroValidacaoCPF(null);

    // Validações antes de enviar
    if (!clienteEditando.nome || !clienteEditando.nome.trim()) {
      setErroValidacaoCPF('Nome é obrigatório');
      setLoading(false);
      return;
    }

    if (!validarCPF(clienteEditando.cpf || '')) {
      setErroValidacaoCPF('CPF inválido! Por favor, verifique o número digitado.');
      setLoading(false);
      return;
    }

    if (!clienteEditando.email || !clienteEditando.email.includes('@')) {
      setErroValidacaoCPF('E-mail inválido');
      setLoading(false);
      return;
    }

    if (!clienteEditando.telefone || clienteEditando.telefone.replace(/\D/g, '').length < 8) {
      setErroValidacaoCPF('Telefone inválido');
      setLoading(false);
      return;
    }

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
        const error = await response.json().catch(() => ({ error: 'Erro ao atualizar cliente' }));
        // exibir mensagem global e inline
        setMessage({ type: "error", text: error.error || "Erro ao atualizar cliente" });
        setErroValidacaoCPF(error.error || "Erro ao atualizar cliente");
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
      setErroValidacaoCPF('Erro ao conectar com o servidor');
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
      setMessage({ type: 'error', text: 'CPF incompleto. Digite 11 dígitos para buscar o cliente.' });
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
        setMessage({ type: 'error', text: 'Cliente não encontrado para o CPF informado.' });
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      setClienteSelecionado(null);
      setMessage({ type: 'error', text: 'Erro ao buscar cliente. Tente novamente.' });
    } finally {
      setBuscandoCliente(false);
    }
  };

  const handleFinalizarVenda = async (e: React.FormEvent) => {
    e.preventDefault();

    // Impede reentrância caso já estejamos processando uma submissão
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Validações iniciais
    if (carrinho.length === 0) {
      setMessage({ type: "error", text: "Adicione pelo menos um item ao carrinho!" });
      isSubmittingRef.current = false;
      return;
    }

    if (!novoPedido.nomeCliente || !novoPedido.cpfCliente) {
      setMessage({ type: "error", text: "Preencha o CPF e nome do cliente!" });
      isSubmittingRef.current = false;
      return;
    }

    if (!clienteSelecionado) {
      setMessage({ type: "error", text: "Cliente não encontrado! Verifique o CPF ou cadastre o cliente primeiro." });
      isSubmittingRef.current = false;
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // preparar payload único para todo o carrinho
      const itemsPayload = carrinho.map(it => ({
        produtoId: it.produtoId,
        tamanho: it.tamanho,
        quantidade: it.quantidade,
        precoUnitario: it.precoUnitario,
        precoTotal: it.precoTotal,
        observacoes: it.observacoes || undefined,
      }));

      // escolher primeira foto encontrada como imagem principal (compatibilidade com upload.single)
      const firstPhotoFile = carrinho.find(it => it.foto)?.foto || null;

      const formData = new FormData();
      formData.append("nomeCliente", novoPedido.nomeCliente);
      formData.append("cpfCliente", novoPedido.cpfCliente.replace(/\D/g, ""));
      formData.append("telefoneCliente", novoPedido.telefoneCliente || "");
      formData.append("clienteId", clienteSelecionado._id);
      formData.append("vendedorId", userData?.id || "");
      formData.append("status", "Aguardando Pagamento");

      // preços e cupom
      formData.append("preco", totalFinal.toString());
      formData.append("precoOriginal", totalCarrinho.toString());
      if (cupomAplicado) {
        formData.append("cupomAplicado", cupomAplicado._id);
        // enviar desconto total em reais
        const descontoTotal = ((cupomAplicado.desconto / 100) * totalCarrinho);
        formData.append("descontoAplicado", descontoTotal.toString());
      }

      // anexar items como JSON
      formData.append("items", JSON.stringify(itemsPayload));

      if (firstPhotoFile) {
        formData.append("photo", firstPhotoFile);
      }

      const response = await fetch(`${API_URL}/pedidos`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao criar pedido");
      }

      const pedidoCriado = await response.json();

      // se cupom aplicado, registrar uso
      if (cupomAplicado) {
        try {
          await fetch(`${API_URL}/cupons/${cupomAplicado._id}/aplicar`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ clienteId: clienteSelecionado._id }),
          });
        } catch (err) {
          console.warn("Aviso: Erro ao registrar uso do cupom");
        }
      }

      // tentar gerar link de pagamento
      try {
        const pagamentoResponse = await fetch(`${API_URL}/pagamento/criar`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            clienteId: clienteSelecionado._id,
            pedidos: [pedidoCriado._id || pedidoCriado.pedido?._id],
            valorTotal: totalFinal,
            telefone: novoPedido.telefoneCliente,
            nomeCliente: novoPedido.nomeCliente,
          }),
        });

        if (!pagamentoResponse.ok) {
          console.warn("Aviso: Link de pagamento não foi gerado, mas pedido foi criado.");
        }
      } catch (pagamentoError) {
        console.warn("Aviso: Erro ao gerar link de pagamento:", pagamentoError);
      }

      setMessage({ type: "success", text: "Venda finalizada! Pedido criado com sucesso." });
      // reset estado
      setNovoPedido({ nomeCliente: "", cpfCliente: "", telefoneCliente: "" });
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
      isSubmittingRef.current = false;
    }
  };

  const handleCriarTrajeto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validar CEP antes de enviar (remover não dígitos e exigir 8 números)
    const cepLimpo = (novoTrajeto.cep || '').replace(/\D/g, '');
    if (!cepLimpo || cepLimpo.length !== 8) {
      setMessage({ type: 'error', text: 'CEP inválido. Informe um CEP com 8 dígitos.' });
      setLoading(false);
      return;
    }

    // Tentar consultar ViaCEP para validar e preencher campos opcionais (cidade/estado/rua/bairro)
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      if (viaCepRes.ok) {
        const viaCepData = await viaCepRes.json();
        if (viaCepData && !viaCepData.erro) {
          // Preenche campos somente se estiverem vazios no formulário
          setNovoTrajeto(prev => ({
            ...prev,
            cidade: prev.cidade || viaCepData.localidade || prev.cidade,
            estado: prev.estado || viaCepData.uf || prev.estado,
            rua: prev.rua || viaCepData.logradouro || prev.rua,
            bairro: prev.bairro || viaCepData.bairro || prev.bairro,
          }));
          // small delay to allow state patching before submit (non-blocking)
          await new Promise(res => setTimeout(res, 100));
        } else {
          setMessage({ type: 'error', text: 'CEP não encontrado. Verifique o CEP informado.' });
          setLoading(false);
          return;
        }
      } else {
        // Se ViaCEP indisponível, apenas prosseguir com validação básica
        console.warn('ViaCEP indisponível, prosseguindo com envio sem preenchimento automático');
      }
    } catch (err) {
      console.warn('Erro ao consultar ViaCEP:', err);
      // prossegue mesmo se a consulta falhar
    }

    try {
      let response;

      const payload: any = {
        ...novoTrajeto,
        vendedorId: userData?.id,
        status: "Pendente",
        dataVisita: convertDateToISO(novoTrajeto.dataVisita),
      };

      if (editTrajetoId) {
        // edição
        response = await fetch(`${API_URL}/trajeto/${editTrajetoId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Trajeto atualizado com sucesso!' });
          setEditTrajetoId(null);
        } else {
          const error = await response.json().catch(() => ({}));
          setMessage({ type: 'error', text: error.error || 'Erro ao atualizar trajeto' });
        }
      } else {
        // criação
        response = await fetch(`${API_URL}/trajeto`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (response.ok) {
          setMessage({ type: 'success', text: 'Trajeto cadastrado com sucesso!' });
        } else {
          const error = await response.json().catch(() => ({}));
          setMessage({ type: 'error', text: error.error || 'Erro ao cadastrar trajeto' });
        }
      }

      if (response && response.ok) {
        setNovoTrajeto({ nomeCliente: "", cidade: "", estado: "", rua: "", bairro: "", cep: "", complemento: "", numero: "", pontoReferencia: "", dataVisita: "" });
        setShowNovoTrajeto(false);
        fetchTrajetos();
        setActiveTab("trajetos");
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  // salvar atualizações de um trajeto existente
  const handleSalvarTrajeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTrajetoId) return;
    setLoading(true);
    setMessage(null);

    try {
      const payload: any = {
        ...novoTrajeto,
        vendedorId: userData?.id,
        status: 'Pendente',
        dataVisita: convertDateToISO(novoTrajeto.dataVisita),
      };

      const response = await fetch(`${API_URL}/trajeto/${editTrajetoId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Trajeto atualizado com sucesso!' });
        setEditTrajetoId(null);
        setNovoTrajeto({ nomeCliente: '', cidade: '', estado: '', rua: '', bairro: '', cep: '', complemento: '', numero: '', pontoReferencia: '', dataVisita: '' });
        setShowNovoTrajeto(false);
        fetchTrajetos();
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'Erro ao atualizar trajeto' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  // abre formulário preenchido para edição
  const handleEditarTrajeto = (t: Trajeto) => {
    setNovoTrajeto({
      nomeCliente: t.nomeCliente || '',
      cidade: t.cidade || '',
      estado: t.estado || '',
      rua: t.rua || '',
      bairro: t.bairro || '',
      cep: t.cep || '',
      complemento: (t as any).complemento || '',
      numero: (t as any).numero || '',
      pontoReferencia: (t as any).pontoReferencia || '',
      dataVisita: t.dataVisita ? new Date(t.dataVisita).toISOString().split('T')[0] : '',
    });
    setEditTrajetoId(t._id);
    setShowNovoTrajeto(true);
    setActiveTab('trajetos');
  };

  // deletar trajeto
  const handleDeletarTrajeto = async (trajetoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este trajeto?')) return;
    try {
      const response = await fetch(`${API_URL}/trajeto/${trajetoId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) { setMessage({ type: 'success', text: 'Trajeto excluído com sucesso!' }); fetchTrajetos(); } else setMessage({ type: 'error', text: 'Erro ao excluir trajeto' });
    } catch (err) { setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' }); }
  };

  // Helper: converte DD/MM/AAAA ou AAAA-MM-DD para ISO AAAA-MM-DD
  const convertDateToISO = (dateStr: string) => {
    if (!dateStr) return "";
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return "";
      const [d, m, y] = parts;
      const year = y.length === 4 ? y : (y.length === 2 ? `20${y}` : y);
      return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    // assume already ISO
    return dateStr;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Sidebar active={activeTab} onChange={(t) => setActiveTab(t as any)} items={[
        { key: 'dashboard', label: '📊 Dashboard' },
        { key: 'pedidos', label: '📦 Pedidos' },
        { key: 'novoPedido', label: '💸 Realizar Venda' },
        { key: 'trajetos', label: '🗺️ Trajetos' },
        { key: 'clientes', label: '👤 Clientes' },
      ]} />

      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-4">
          <h1 className="text-2xl text-white font-bold">Dashboard</h1>
        </div>

        {message && (
          <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {message.text}
          </div>
        )}

        {/* Abas principais */}
        <div className="tabs tabs-boxed mb-4">
          <a className={`tab cursor-pointer ${activeTab === "dashboard" ? "tab-active" : ""}`} onClick={() => setActiveTab("dashboard")}>Dashboard</a>
          <a className={`tab cursor-pointer ${activeTab === "pedidos" ? "tab-active" : ""}`} onClick={() => setActiveTab("pedidos")}>Pedidos</a>
          <a className={`tab cursor-pointer ${activeTab === "trajetos" ? "tab-active" : ""}`} onClick={() => setActiveTab("trajetos")}>Trajetos</a>
          <a className={`tab cursor-pointer ${activeTab === "clientes" ? "tab-active" : ""}`} onClick={() => setActiveTab("clientes")}>Clientes</a>
        </div>

        {/* Conteúdo das abas */}
        {activeTab === "dashboard" && (
          <div className="bg-card p-4 rounded">
            <h2 className="text-lg text-white font-semibold mb-2">Bem-vindo, {userData?.login}!</h2>
            <p className="text-sm text-white/80">Aqui está um resumo rápido:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-800 p-4 rounded">
                <div className="text-xs text-white/50 mb-1">Total de Pedidos</div>
                <div className="text-lg text-white font-bold">{pedidos.length}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded">
                <div className="text-xs text-white/50 mb-1">Total de Trajetos</div>
                <div className="text-lg text-white font-bold">{trajetos.length}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded">
                <div className="text-xs text-white/50 mb-1">Total de Clientes</div>
                <div className="text-lg text-white font-bold">{clientes.length}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded">
                <div className="text-xs text-white/50 mb-1">Total em Vendas</div>
                <div className="text-lg text-white font-bold">
                  R$ {pedidos.reduce((acc, pedido) => acc + pedido.preco, 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pedidos" && (
          <div className="bg-card p-4 rounded">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg text-white font-semibold">Meus Pedidos</h2>
              <button className="btn btn-gold" onClick={() => setActiveTab("novoPedido")}>Novo Pedido</button>
            </div>

            {pedidos.length === 0 ? (
              <div className="bg-card p-4 rounded">Nenhum pedido encontrado.</div>
            ) : (
              <div className="bg-card p-4 rounded space-y-2">
                {pedidos.map(p => (
                  <div key={p._id} className="flex items-center justify-between p-3 border-b border-white/6">
                    <div>
                      <div className="font-medium">{p.nomeCliente}</div>
                      <div className="text-sm kv-muted">{new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-sm kv-muted">R$ {p.preco.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "trajetos" && (
          <div className="bg-card p-4 rounded">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg text-white font-semibold">Meus Trajetos</h2>
              <button className="btn btn-gold" onClick={() => setShowNovoTrajeto(true)}>Novo Trajeto</button>
            </div>

            {showNovoTrajeto && (
              <div className="bg-card p-4 rounded mb-4">
                <form onSubmit={editTrajetoId ? (e) => { e.preventDefault(); handleSalvarTrajeto(e); } : handleCriarTrajeto} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="col-span-full md:col-span-2">
                    <label className="text-sm text-white mb-1 block">Nome do Cliente</label>
                    <input
                      type="text"
                      value={novoTrajeto.nomeCliente}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, nomeCliente: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Nome do Cliente"
                      required
                    />
                  </div>

                  <div className="col-span-full md:col-span-1">
                    <label className="text-sm text-white mb-1 block">Data da Visita</label>
                    <input
                      type="date"
                      value={novoTrajeto.dataVisita}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, dataVisita: e.target.value })}
                      className="input-gold w-full"
                      required
                    />
                  </div>

                  <div className="col-span-full md:col-span-2">
                    <label className="text-sm text-white mb-1 block">Cidade</label>
                    <input
                      type="text"
                      value={novoTrajeto.cidade}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, cidade: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Cidade"
                      required
                    />
                  </div>

                  <div className="col-span-full md:col-span-1">
                    <label className="text-sm text-white mb-1 block">Estado</label>
                    <input
                      type="text"
                      value={novoTrajeto.estado}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, estado: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Estado"
                      required
                    />
                  </div>

                  <div className="col-span-full md:col-span-2">
                    <label className="text-sm text-white mb-1 block">Rua</label>
                    <input
                      type="text"
                      value={novoTrajeto.rua}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, rua: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Rua"
                      required
                    />
                  </div>

                  <div className="col-span-full md:col-span-1">
                    <label className="text-sm text-white mb-1 block">Número</label>
                    <input
                      type="text"
                      value={novoTrajeto.numero}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, numero: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Número"
                      required
                    />
                  </div>

                  <div className="col-span-full md:col-span-2">
                    <label className="text-sm text-white mb-1 block">Bairro</label>
                    <input
                      type="text"
                      value={novoTrajeto.bairro}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, bairro: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Bairro"
                      required
                    />
                  </div>

                  <div className="col-span-full md:col-span-1">
                    <label className="text-sm text-white mb-1 block">CEP</label>
                    <input
                      type="text"
                      value={novoTrajeto.cep}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, cep: e.target.value })}
                      className="input-gold w-full"
                      placeholder="CEP"
                      required
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="text-sm text-white mb-1 block">Complemento</label>
                    <input
                      type="text"
                      value={novoTrajeto.complemento}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, complemento: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Complemento"
                    />
                  </div>

                  <div className="col-span-full">
                    <label className="text-sm text-white mb-1 block">Ponto de Referência</label>
                    <input
                      type="text"
                      value={novoTrajeto.pontoReferencia}
                      onChange={e => setNovoTrajeto({ ...novoTrajeto, pontoReferencia: e.target.value })}
                      className="input-gold w-full"
                      placeholder="Ponto de Referência"
                    />
                  </div>

                  <div className="col-span-full md:col-span-3 flex gap-2"><button className="btn btn-gold" type="submit">{editTrajetoId ? 'Salvar' : 'Criar Trajeto'}</button><button type="button" className="btn btn-ghost" onClick={() => { setShowNovoTrajeto(false); setEditTrajetoId(null); setNovoTrajeto({ nomeCliente: '', cidade: '', estado: '', rua: '', bairro: '', cep: '', complemento: '', numero: '', pontoReferencia: '', dataVisita: '' }); }}>Cancelar</button></div>
                </form>
              </div>
            )}

            {trajetos.length === 0 ? (
              <div className="bg-card p-4 rounded">Nenhum trajeto encontrado.</div>
            ) : (
              <div className="bg-card p-4 rounded space-y-2">
                {trajetos.map(t => {
                  const canManage = String((t as any).vendedorId?._id || (t as any).vendedorId) === String(userData!.id);
                  return (
                    <div key={t._id} className="flex items-center justify-between p-3 border-b border-white/6">
                      <div>
                        <div className="font-medium">{t.nomeCliente}</div>
                        <div className="text-sm kv-muted">{t.cidade} - {t.estado}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm kv-muted">{new Date(t.createdAt).toLocaleDateString()}</div>
                        {canManage && (
                          <div className="flex gap-2">
                            <button className="btn btn-ghost" onClick={() => handleEditarTrajeto(t)}>Editar</button>
                            <button className="btn btn-primary" onClick={() => { if (confirm('Tem certeza que deseja excluir este trajeto?')) handleDeletarTrajeto(t._id); }}>Excluir</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "clientes" && (
          <div className="bg-card p-4 rounded">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg text-white font-semibold">Meus Clientes</h2>
              <button className="btn btn-gold" onClick={() => setActiveTab("novoCliente")}>Novo Cliente</button>
            </div>

            {clientes.length === 0 ? (
              <div className="bg-card p-4 rounded">Nenhum cliente encontrado.</div>
            ) : (
              <div className="bg-card p-4 rounded space-y-2">
                {clientes.map(c => (
                  <div key={c._id} className="flex items-center justify-between p-3 border-b border-white/6">
                    <div>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-sm kv-muted">{c.email}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm kv-muted">{c.telefone}</div>
                      <button className="btn btn-ghost" onClick={() => abrirEdicaoCliente(c)}>Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Formulários rápidos (Novo Pedido, Novo Cliente) */}
        {activeTab === "novoPedido" && (
          <div className="bg-card p-4 rounded">
            <h2 className="text-lg text-white font-semibold mb-4">Novo Pedido</h2>

            <form onSubmit={handleFinalizarVenda} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white mb-1 block">CPF do Cliente</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoPedido.cpfCliente}
                    onChange={e => setNovoPedido({ ...novoPedido, cpfCliente: e.target.value })}
                    className="input-gold flex-1"
                    placeholder="Digite o CPF"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => buscarClientePorCPF(novoPedido.cpfCliente)}
                    disabled={buscandoCliente}
                  >
                    {buscandoCliente ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                {clienteSelecionado && (
                  <div className="mt-2 p-3 bg-green-500/10 text-green-900 rounded">
                    Cliente encontrado: {clienteSelecionado.nome} - {clienteSelecionado.telefone}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Nome do Cliente</label>
                <input
                  type="text"
                  value={novoPedido.nomeCliente}
                  onChange={e => setNovoPedido({ ...novoPedido, nomeCliente: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Nome do Cliente"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Telefone do Cliente</label>
                <input
                  type="text"
                  value={novoPedido.telefoneCliente}
                  onChange={e => setNovoPedido({ ...novoPedido, telefoneCliente: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Telefone do Cliente"
                  required
                />
              </div>

              {/* Itens do pedido */}
              <div className="col-span-full">
                <label className="text-sm text-white mb-1 block">Itens do Pedido</label>
                <div className="bg-gray-800 p-4 rounded">
                  {carrinho.length === 0 ? (
                    <div className="text-center text-white/50 py-2">Nenhum item no carrinho</div>
                  ) : (
                    <div className="space-y-2">
                      {carrinho.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-2 bg-gray-900 rounded">
                          <div className="flex-1">
                            <div className="text-sm text-white">{item.produtoNome} ({item.tamanho})</div>
                            <div className="text-xs text-white/70">{item.observacoes}</div>
                          </div>
                          <div className="text-sm text-white">
                            R$ {item.precoTotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cupom de desconto */}
              <div className="col-span-full">
                <label className="text-sm text-white mb-1 block">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoCupom}
                    onChange={e => setCodigoCupom(e.target.value)}
                    className="input-gold flex-1"
                    placeholder="Código do cupom"
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleValidarCupom}
                    disabled={validandoCupom}
                  >
                    {validandoCupom ? 'Validando...' : 'Validar'}
                  </button>
                </div>
                {cupomAplicado && (
                  <div className="mt-2 p-3 bg-green-500/10 text-green-900 rounded">
                    Cupom aplicado: {cupomAplicado.codigo} - Desconto: R$ {cupomAplicado.valorDesconto.toFixed(2)}
                  </div>
                )}
                {erroCupom && (
                  <div className="mt-2 text-sm text-red-500">{erroCupom}</div>
                )}
              </div>

              <div className="col-span-full flex justify-end gap-2">
                <button className="btn btn-gold" type="submit">Finalizar Venda</button>
                <button type="button" className="btn btn-ghost" onClick={() => setActiveTab("pedidos")}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "novoCliente" && (
          <div className="bg-card p-4 rounded">
            <h2 className="text-lg text-white font-semibold mb-4">Novo Cliente</h2>

            <form onSubmit={handleAtualizarCliente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white mb-1 block">Nome</label>
                <input
                  type="text"
                  value={novoCliente.nome}
                  onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Nome do Cliente"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">CPF</label>
                <input
                  type="text"
                  value={novoCliente.cpf}
                  onChange={e => setNovoCliente({ ...novoCliente, cpf: formatarCPF(e.target.value) })}
                  className="input-gold w-full"
                  placeholder="CPF do Cliente"
                  maxLength={14}
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">E-mail</label>
                <input
                  type="email"
                  value={novoCliente.email}
                  onChange={e => setNovoCliente({ ...novoCliente, email: e.target.value })}
                  className="input-gold w-full"
                  placeholder="E-mail do Cliente"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Telefone</label>
                <input
                  type="text"
                  value={novoCliente.telefone}
                  onChange={e => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Telefone do Cliente"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Cidade</label>
                <input
                  type="text"
                  value={novoCliente.cidade}
                  onChange={e => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Cidade"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Estado</label>
                <input
                  type="text"
                  value={novoCliente.estado}
                  onChange={e => setNovoCliente({ ...novoCliente, estado: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Estado"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Rua</label>
                <input
                  type="text"
                  value={novoCliente.rua}
                  onChange={e => setNovoCliente({ ...novoCliente, rua: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Rua"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Número</label>
                <input
                  type="text"
                  value={novoCliente.numero}
                  onChange={e => setNovoCliente({ ...novoCliente, numero: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Número"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">Bairro</label>
                <input
                  type="text"
                  value={novoCliente.bairro}
                  onChange={e => setNovoCliente({ ...novoCliente, bairro: e.target.value })}
                  className="input-gold w-full"
                  placeholder="Bairro"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-white mb-1 block">CEP</label>
                <input
                  type="text"
                  value={novoCliente.cep}
                  onChange={e => setNovoCliente({ ...novoCliente, cep: e.target.value })}
                  className="input-gold w-full"
                  placeholder="CEP"
                  required
                />
              </div>

              <div className="col-span-full flex justify-end gap-2">
                <button className="btn btn-gold" type="submit">Salvar Cliente</button>
                <button type="button" className="btn btn-ghost" onClick={() => setActiveTab("clientes")}>Cancelar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}