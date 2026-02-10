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
      const response = await fetch(`${API_URL}/trajeto`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...novoTrajeto,
          vendedorId: userData?.id,
          status: "Pendente",
          // enviar data em ISO (se preenchida)
          dataVisita: convertDateToISO(novoTrajeto.dataVisita),
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

    // Validações antes de enviar
    if (!isNovoClienteValido(novoCliente)) {
      setErroValidacaoCPF('Preencha Nome, CPF, E-mail e Telefone válidos antes de criar o cliente.');
      setLoading(false);
      return;
    }

    // Validar CPF antes de enviar (duplicado por segurança adicional)
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

  // Formata entrada de data para DD/MM/AAAA enquanto o usuário digita
  const formatDateInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0,8); // até 8 dígitos
    const day = cleaned.slice(0,2);
    const month = cleaned.slice(2,4);
    const year = cleaned.slice(4,8);
    let result = day;
    if (month) result += `/${month}`;
    if (year) result += `/${year}`;
    return result;
  };

  // Converte DD/MM/AAAA para AAAA-MM-DD (ISO) ou retorna empty string se inválido
  const convertDateToISO = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('/');
    if (parts.length !== 3) return "";
    const [d, m, y] = parts;
    if (!d || !m || !y) return "";
    const day = d.padStart(2, '0');
    const month = m.padStart(2, '0');
    const year = y.length === 4 ? y : (y.length === 2 ? `20${y}` : '');
    if (!year) return "";
    return `${year}-${month}-${day}`;
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-transparent to-transparent min-h-screen">
        {/* Header é fornecido globalmente no layout; removido localmente para evitar duplicação */}

         <div className="container-responsive grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
           <div className="lg:col-span-3">
             <div className="sticky top-6">
               <Sidebar
                 active={activeTab}
                 onChange={(t) => setActiveTab(t as any)}
                 items={[
                   { key: 'dashboard', label: '📊 Dashboard' },
                   { key: 'pedidos', label: '📦 Pedidos' },
                   { key: 'novoPedido', label: '💸 Realizar Venda' },
                   { key: 'trajetos', label: '🗺️ Trajetos' },
                   { key: 'clientes', label: '👤 Clientes' },
                 ]}
               />
             </div>
           </div>
           
           <div className="lg:col-span-9">
             <main className="space-y-6">
               {/* Mensagem de feedback */}
               {message && (
                 <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-700/30" : "bg-red-700/30"}`}>
                   {message.text}
                 </div>
               )}

              {/* Conteúdo por aba */}

              {activeTab === 'dashboard' && (
                <section>
                  <h2 className="text-3xl font-bold mb-4 kv-accent">Painel</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'var(--accent)' }}>
                      <h3 className="text-lg kv-muted">Pedidos Pendentes</h3>
                      <p className="text-4xl font-bold kv-accent">{pedidos.filter(p => p.status === 'Pendente').length}</p>
                    </div>
                    <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'var(--accent-2)' }}>
                      <h3 className="text-lg kv-muted">Em Progresso</h3>
                      <p className="text-4xl font-bold kv-accent">{pedidos.filter(p => p.status === 'Em Progresso').length}</p>
                    </div>
                    <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'rgba(34,197,94,0.8)' }}>
                      <h3 className="text-lg kv-muted">Concluídos</h3>
                      <p className="text-4xl font-bold text-success">{pedidos.filter(p => p.status === 'Concluído').length}</p>
                    </div>
                    <div className="bg-card p-6 rounded-xl shadow-lg border-l-4" style={{ borderColor: 'var(--accent-2)' }}>
                      <h3 className="text-lg kv-muted">{userData?.role === 'vendedor' ? 'Meu Faturamento' : 'Faturamento'}</h3>
                      <p className="text-3xl font-bold kv-accent">R$ {(
                        userData?.role === 'vendedor'
                        ? pedidos.filter(p => p.status === 'Concluído' && (String((p as any).vendedorId?._id || (p as any).vendedorId) === String(userData.id))).reduce((acc, p) => acc + (p.preco || 0), 0)
                        : pedidos.filter(p => p.status === 'Concluído').reduce((acc, p) => acc + (p.preco || 0), 0)
                      ).toFixed(2)}</p>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'pedidos' && (
                <section>
                  <h3 className="text-xl font-semibold kv-accent mb-4">Pedidos</h3>
                  {pedidos.filter(p => p.status !== 'Cancelado').length === 0 ? (
                    <div className="bg-card p-4 rounded">Nenhum pedido encontrado.</div>
                  ) : (
                    <div className="bg-card p-4 rounded space-y-2">
                      {pedidos.filter(p => p.status !== 'Cancelado').map(p => (
                        <div key={p._id} className="flex items-center justify-between p-3 border-b border-white/6">
                          <div>
                            <div className="font-medium">{p.nomeCliente}</div>
                            <div className="text-sm kv-muted">{p.produtoId?.name || 'Produto'} • R$ {p.preco?.toFixed(2)}</div>
                            <div className="text-xs kv-muted">Criado em: {new Date(p.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-sm badge-gold">{p.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'novoPedido' && (
                <section>
                  <h3 className="text-xl font-semibold kv-accent mb-4">Realizar Venda</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Formulário principal */}
                    <div className="md:col-span-2 bg-card p-4 rounded">
                      <h4 className="font-semibold mb-2">Cliente</h4>

                      <div className="flex gap-2 items-center mb-4">
                        <input
                          className="input-gold text-white"
                          placeholder="CPF do cliente"
                          value={novoPedido.cpfCliente}
                          onChange={e => setNovoPedido(s => ({ ...s, cpfCliente: e.target.value }))}
                        />
                        <button type="button" className="btn btn-gold" onClick={() => buscarClientePorCPF(novoPedido.cpfCliente)}>Buscar</button>
                      </div>

                      {clienteSelecionado ? (
                        <div className="mb-4 p-3 rounded-md bg-green-900/60 border border-green-700 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-lg font-bold">{clienteSelecionado.nome}</div>
                              <div className="text-sm kv-muted">{clienteSelecionado.email} • {clienteSelecionado.telefone}</div>
                              <div className="text-xs kv-muted mt-1">CPF: {clienteSelecionado.cpf}</div>
                            </div>
                            <div className="flex gap-2">
                              <button className="btn btn-ghost" onClick={() => { setClienteSelecionado(null); setNovoPedido(prev => ({ ...prev, nomeCliente: '', telefoneCliente: '' })); }}>Remover</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm kv-muted mb-4">Nenhum cliente selecionado. Busque por CPF ou crie um novo cliente na aba Clientes.</div>
                      )}

                      <h4 className="font-semibold mb-2">Adicionar item</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div>
                          <ComboBox
                            label="Categoria"
                            options={categoriasUnicas.map(cat => ({ value: cat._id, label: cat.name }))}
                            value={itemAtual.categoria}
                            onChange={v => setItemAtual(s => ({ ...s, categoria: v, produtoId: '' }))}
                            placeholder="Selecionar categoria"
                          />
                        </div>

                        <div>
                          <ComboBox
                            label="Produto"
                            options={produtosFiltrados.map(p => ({ value: p._id, label: `${p.name} — R$ ${p.preco.toFixed(2)}` }))}
                            value={itemAtual.produtoId}
                            onChange={v => setItemAtual(s => ({ ...s, produtoId: v }))}
                            placeholder="Selecionar produto"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                        <div>
                          <ComboBox
                            label="Tamanho"
                            options={tamanhosDisponiveis.map(t => ({ value: t, label: t }))}
                            value={itemAtual.tamanho}
                            onChange={v => setItemAtual(s => ({ ...s, tamanho: v }))}
                            placeholder="Tamanho"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-white mb-1 block">Quantidade</label>
                          <input
                            type="number"
                            min={1}
                            className="input-gold text-white w-20"
                            value={itemAtual.quantidade}
                            onChange={e => setItemAtual(s => ({ ...s, quantidade: Number(e.target.value) }))}
                          />
                        </div>

                        <div>
                          <label className="text-sm text-white mb-1 block">Anexar imagem (opcional)</label>
                          <div className="flex items-center gap-2">
                            <input id="foto-input" type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />

                            {/* botão com aparência consistente */}
                            <label htmlFor="foto-input" className="inline-flex items-center px-3 py-2 rounded-md border border-white/10 cursor-pointer bg-card text-white">
                              <span className="text-sm">Escolher arquivo</span>
                            </label>

                            {/* área que mostra miniatura + nome do arquivo */}
                            <div className="flex items-center gap-3 flex-1">
                              {previewFotoAtual ? (
                                <img src={previewFotoAtual} alt="Preview" className="w-16 h-16 object-cover rounded" />
                              ) : null}

                              <div className="flex-1">
                                {fotoItemAtual ? (
                                  <div className="input-gold px-3 py-2 text-sm text-white truncate">{fotoItemAtual.name}</div>
                                ) : (
                                  <div className="text-sm kv-muted">Nenhum arquivo selecionado</div>
                                )}
                              </div>

                              {fotoItemAtual && (
                                <button type="button" className="btn btn-ghost ml-2" onClick={() => { setFotoItemAtual(null); setPreviewFotoAtual(null); }}>Limpar</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="text-sm kv-muted block mb-1">Observações (opcional)</label>
                        <textarea
                          className="input-gold text-white w-full h-24"
                          placeholder="Ex: personalização, instruções de entrega, observações"
                          value={itemAtual.observacoes}
                          onChange={e => setItemAtual(s => ({ ...s, observacoes: e.target.value }))}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button type="button" className="btn btn-gold" onClick={handleAdicionarAoCarrinho}>Adicionar ao carrinho</button>
                        <button type="button" className="btn btn-ghost" onClick={() => { setItemAtual({ categoria: '', produtoId: '', tamanho: '', quantidade: 1, observacoes: '' }); setFotoItemAtual(null); setPreviewFotoAtual(null); }}>Limpar</button>
                      </div>

                      {previewFotoAtual && (
                        <img src={previewFotoAtual} alt="Preview" className="mt-3 w-32 h-32 object-cover rounded" />
                      )}
                    </div>

                    {/* Carrinho */}
                    <div className="md:col-span-1 bg-card p-4 rounded">
                      <h4 className="font-semibold mb-2">Carrinho</h4>

                      {carrinho.length === 0 ? (
                        <div className="text-sm kv-muted">Carrinho vazio</div>
                      ) : (
                        <div className="space-y-2">
                          {carrinho.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium">{item.produtoNome} x{item.quantidade}</div>
                                <div className="text-sm kv-muted">{item.categoria} • {item.tamanho} • R$ {item.precoTotal.toFixed(2)}</div>
                                {item.observacoes && <div className="text-xs kv-muted mt-1">Obs: {item.observacoes}</div>}
                              </div>
                              <div className="flex flex-col gap-2">
                                <button className="btn btn-ghost" onClick={() => handleRemoverDoCarrinho(item.id)}>Remover</button>
                              </div>
                            </div>
                          ))}

                          <div className="mt-3 font-semibold">Total: R$ {totalCarrinho.toFixed(2)}</div>
                          <div className="mt-3 flex gap-2">
                            <button
                              className={`btn btn-gold ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                              onClick={handleFinalizarVenda}
                              disabled={loading}
                            >
                              {loading ? 'Processando...' : 'Finalizar Venda'}
                            </button>
                            <button className="btn btn-ghost" onClick={() => { setCarrinho([]); setCodigoCupom(''); setCupomAplicado(null); setMessage(null); }}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'trajetos' && (
                <section>
                  <h3 className="text-xl font-semibold kv-accent mb-4">Trajetos</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div />
                    <div className="flex gap-2">
                      <button className="btn btn-gold" onClick={() => setShowNovoTrajeto(s => !s)}>{showNovoTrajeto ? 'Fechar' : '+ Novo Trajeto'}</button>
                    </div>
                  </div>

                  {showNovoTrajeto && (
                    <div className="bg-card p-4 rounded mb-4">
                      <form onSubmit={handleCriarTrajeto} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input className="input-gold md:col-span-2" placeholder="Nome do Cliente" value={novoTrajeto.nomeCliente} onChange={e => setNovoTrajeto(s => ({ ...s, nomeCliente: e.target.value }))} />
                        <input className="input-gold" placeholder="Cidade" value={novoTrajeto.cidade} onChange={e => setNovoTrajeto(s => ({ ...s, cidade: e.target.value }))} />
                        <input className="input-gold" placeholder="Estado" value={novoTrajeto.estado} onChange={e => setNovoTrajeto(s => ({ ...s, estado: e.target.value }))} />
                        <input className="input-gold md:col-span-2" placeholder="Rua" value={novoTrajeto.rua} onChange={e => setNovoTrajeto(s => ({ ...s, rua: e.target.value }))} />
                        <input className="input-gold" placeholder="Bairro" value={novoTrajeto.bairro} onChange={e => setNovoTrajeto(s => ({ ...s, bairro: e.target.value }))} />
                        <input className="input-gold" placeholder="CEP" value={novoTrajeto.cep} onChange={e => setNovoTrajeto(s => ({ ...s, cep: e.target.value }))} />
                        <input className="input-gold" placeholder="Data Visita (DD/MM/AAAA)" value={novoTrajeto.dataVisita} onChange={e => setNovoTrajeto(s => ({ ...s, dataVisita: formatDateInput(e.target.value) }))} />
                        <div className="col-span-full md:col-span-3 flex gap-2"><button className="btn btn-gold" type="submit">Criar Trajeto</button><button type="button" className="btn btn-ghost" onClick={() => setShowNovoTrajeto(false)}>Cancelar</button></div>
                      </form>
                    </div>
                  )}

                  {trajetos.length === 0 ? (
                    <div className="bg-card p-4 rounded">Nenhum trajeto encontrado.</div>
                  ) : (
                    <div className="bg-card p-4 rounded space-y-2">
                      {trajetos.map(t => (
                        <div key={t._id} className="flex items-center justify-between p-3 border-b border-white/6">
                          <div>
                            <div className="font-medium">{t.nomeCliente}</div>
                            <div className="text-sm kv-muted">{t.cidade} - {t.estado}</div>
                          </div>
                          <div className="text-sm kv-muted">{new Date(t.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'clientes' && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold kv-accent">Clientes</h3>
                    <button className="btn btn-gold" onClick={() => setShowNovoCliente(s => !s)}>{showNovoCliente ? 'Fechar' : '+ Novo Cliente'}</button>
                  </div>

                  {showNovoCliente && (
                    <div className="bg-card p-4 rounded mb-4">
                      <form onSubmit={handleCriarCliente} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="input-gold" placeholder="Nome" value={novoCliente.nome} onChange={e => setNovoCliente(s => ({ ...s, nome: e.target.value }))} />
                        <input className="input-gold" placeholder="CPF" value={novoCliente.cpf} onChange={e => setNovoCliente(s => ({ ...s, cpf: e.target.value }))} />
                        <input className="input-gold" placeholder="Email" value={novoCliente.email} onChange={e => setNovoCliente(s => ({ ...s, email: e.target.value }))} />
                        <input className="input-gold" placeholder="Telefone" value={novoCliente.telefone} onChange={e => setNovoCliente(s => ({ ...s, telefone: e.target.value }))} />

                        {/* Campos de endereço solicitados */}
                        <input className="input-gold" placeholder="Cidade" value={novoCliente.cidade} onChange={e => setNovoCliente(s => ({ ...s, cidade: e.target.value }))} />
                        <input className="input-gold" placeholder="Estado" value={novoCliente.estado} onChange={e => setNovoCliente(s => ({ ...s, estado: e.target.value }))} />
                        <input className="input-gold" placeholder="Rua" value={novoCliente.rua} onChange={e => setNovoCliente(s => ({ ...s, rua: e.target.value }))} />
                        <input className="input-gold" placeholder="Número" value={novoCliente.numero} onChange={e => setNovoCliente(s => ({ ...s, numero: e.target.value }))} />
                        <input className="input-gold" placeholder="Bairro" value={novoCliente.bairro} onChange={e => setNovoCliente(s => ({ ...s, bairro: e.target.value }))} />
                        <input className="input-gold" placeholder="CEP" value={novoCliente.cep} onChange={e => setNovoCliente(s => ({ ...s, cep: e.target.value }))} />
                        <input className="input-gold" placeholder="Complemento" value={novoCliente.complemento} onChange={e => setNovoCliente(s => ({ ...s, complemento: e.target.value }))} />

                        {/* Mostrar erro de validação */}
                        {erroValidacaoCPF && (
                          <div className="text-red-400 text-sm col-span-full">{erroValidacaoCPF}</div>
                        )}

                        <div className="col-span-full md:col-span-2 flex gap-2">
                          <button className="btn btn-gold" type="submit" disabled={loading || !isNovoClienteValido(novoCliente)}>{loading ? 'Criando...' : 'Criar Cliente'}</button>
                           <button type="button" className="btn btn-ghost" onClick={() => setShowNovoCliente(false)}>Cancelar</button>
                         </div>
                       </form>
                     </div>
                   )}

                  {/* Lista de clientes */}
                  <div className="bg-card p-4 rounded">
                    {clientes.length === 0 ? (
                      <div className="text-sm kv-muted">Nenhum cliente encontrado.</div>
                    ) : (
                      <div className="space-y-2">
                        {clientes.map(c => (
                          <div key={c._id} className="flex items-center justify-between p-3 border-b border-white/6">
                            <div>
                              <div className="font-medium">{c.nome}</div>
                              <div className="text-sm kv-muted">{c.cidade} - {c.estado} • {c.telefone}</div>
                            </div>
                            <div className="flex gap-2">
                              <button className="btn btn-ghost" onClick={() => abrirEdicaoCliente(c)}>Editar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Modal de edição de cliente */}
              {mostrarModalEdicao && clienteEditando && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setMostrarModalEdicao(false)} />
                  <div className="bg-card p-6 rounded z-10 w-full max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">Editar Cliente</h3>
                    <form onSubmit={handleAtualizarCliente} className="grid grid-cols-1 gap-2">
                      <input className="input-gold" value={clienteEditando.nome} onChange={e => setClienteEditando(prev => prev ? ({ ...prev, nome: e.target.value }) : prev)} />
                      <input className="input-gold" value={clienteEditando.cpf} onChange={e => setClienteEditando(prev => prev ? ({ ...prev, cpf: e.target.value }) : prev)} />
                      <input className="input-gold" value={clienteEditando.email} onChange={e => setClienteEditando(prev => prev ? ({ ...prev, email: e.target.value }) : prev)} />
                      <input className="input-gold" value={clienteEditando.telefone} onChange={e => setClienteEditando(prev => prev ? ({ ...prev, telefone: e.target.value }) : prev)} />

                      {/* Mostrar erro de validação quando aplicável */}
                      {erroValidacaoCPF && (
                        <div className="text-red-400 text-sm">{erroValidacaoCPF}</div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button className="btn btn-gold" type="submit" disabled={loading || !isClienteValido(clienteEditando)}>{loading ? 'Salvando...' : 'Salvar'}</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setMostrarModalEdicao(false)}>Cancelar</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Ações finais / logout */}
              <div className="flex justify-end gap-2 mt-6">
                <button className="btn btn-ghost" onClick={handleLogout}>Sair</button>
              </div>

             </main>
           </div>
         </div>
       </div>
     </div>
     );
}
