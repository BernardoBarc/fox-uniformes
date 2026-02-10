"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "../../config/api";
import Button from "../../components/Button";

interface Pedido {
  _id: string;
  nomeCliente: string;
  produtoId: {
    name: string;
    preco: number;
    tamanho?: string;
  };
  quantidade: number;
  preco: number;
  tamanho?: string;
}

interface Pagamento {
  _id: string;
  clienteId: {
    _id?: string;
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
  };
  pedidos: Pedido[];
  valorTotal: number;
  status: string;
  metodoPagamento?: string;
  parcelas?: number;
  createdAt: string;
}

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

export default function PagamentoPage() {
  const params = useParams();
  const pagamentoId = params.id as string;

  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // metodoPagamento starts null so we don't auto-show PIX when user opens the link
  const [metodoPagamento, setMetodoPagamento] =
    useState<"PIX" | "CREDIT_CARD" | null>(null);

  const [parcelas, setParcelas] = useState(1);
  const [processando, setProcessando] = useState(false);

  const [pixData, setPixData] = useState<null | {
    qrCodeBase64: string;
    copiaECola: string;
  }>(null);

  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  // Apenas para o carregamento do PIX (não usa o overlay global)
  const [pixLoading, setPixLoading] = useState(false);

  // Estado para feedback de cópia do PIX
  const [copiedPix, setCopiedPix] = useState(false);

  // Função robusta para copiar texto para a área de transferência (Clipboard API com fallback)
  const handleCopyPix = async () => {
    try {
      const text = pixData?.copiaECola;
      if (!text) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback: textarea + execCommand
        const textarea = document.createElement('textarea');
        textarea.value = text;
        // evitar mostrar o textarea na tela
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar PIX (handleCopyPix):', err);
      // tentar fallback simples
      try {
        const text = pixData?.copiaECola || '';
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 2000);
      } catch (e) {
        console.error('Fallback de cópia falhou:', e);
      }
    }
  };

  // Função reutilizável para buscar dados PIX sem ativar o overlay global
  const fetchPixData = async () => {
    if (!pagamento?._id) return null;
    setPixLoading(true);
    setCardError(null);
    try {
      const res = await fetch(`${API_URL}/pagamento/${pagamento._id}/pix`);
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        console.error('[DEBUG] /pix response not ok', res.status, txt);
        throw new Error('Falha ao obter dados PIX');
      }
      const data = await res.json();
      setPixData({ qrCodeBase64: data.qrCodeBase64, copiaECola: data.copiaECola });
      // iniciar o estado de aguardando confirmação para iniciar polling
      setAguardandoConfirmacao(true);
      return data;
    } catch (err) {
      console.error('Erro ao obter PIX (fetchPixData):', err);
      setCardError('Erro ao gerar PIX. Tente novamente.');
      return null;
    } finally {
      setPixLoading(false);
    }
  };

  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    cardholderName: "",
    cardExpiration: "",
    cardCvv: "",
    docNumber: "",
    email: "",
  });

  const [cardError, setCardError] = useState<string | null>(null);

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

  const mpInstance = useRef<any>(null);

  // Overlay de loading global para indicar processamento de pagamento
  // Mantém o overlay enquanto processando ou aguardando confirmação via webhook
  const loadingMessage = (processando)
    ? (metodoPagamento === 'CREDIT_CARD' ? 'Processando pagamento com cartão...' : 'Processando pagamento...')
    : null;

  const LoadingOverlay = (processando) ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-white rounded-full border-t-transparent"></div>
        <div className="text-white font-medium">{loadingMessage}</div>
      </div>
    </div>
  ) : null;

  /* ================= BUSCAR PAGAMENTO ================= */
  useEffect(() => {
    const fetchPagamento = async () => {
      try {
        const response = await fetch(`${API_URL}/pagamentos/${pagamentoId}`);
        if (!response.ok) throw new Error();
        setPagamento(await response.json());
      } catch {
        setError("Pagamento não encontrado");
      } finally {
        setLoading(false);
      }
    };

    if (pagamentoId) fetchPagamento();
  }, [pagamentoId]);

  /* ================= SDK MERCADO PAGO ================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    if (!publicKey) {
      console.error("❌ Public Key do Mercado Pago não definida");
      return;
    }

    if (!window.MercadoPago) {
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => {
        mpInstance.current = new window.MercadoPago(publicKey);
      };
      document.body.appendChild(script);
    } else {
      mpInstance.current = new window.MercadoPago(publicKey);
    }
  }, []);

  /* ================= PARCELAMENTO ================= */
  const calcularParcela = (valor: number, num: number) => {
    const juros = num > 1 ? 0.0299 : 0;
    return (valor * (1 + juros * num)) / num;
  };

  /* ================= PAGAR ================= */
  const handlePagar = async () => {
    if (!pagamento) return;

    // Reset de erros
    setCardError(null);

    try {
      /* ---------- PIX ---------- */
      if (metodoPagamento === "PIX") {
        // Se já temos pixData, apenas garantir polling; caso contrário, buscar agora
        if (!pixData) {
          const got = await fetchPixData();
          if (!got) return; // erro já tratado em fetchPixData
        } else {
          setAguardandoConfirmacao(true);
        }
        return; // fluxo PIX finalizado aqui (polling cuidará da confirmação)
      }

      /* ---------- CARTÃO ---------- */
      if (metodoPagamento === "CREDIT_CARD") {
        setProcessando(true);
        if (!mpInstance.current) {
          throw new Error("Mercado Pago não inicializado");
        }

        // Validações básicas dos campos do cartão (mensagens por campo)
        const luhnValid = (num: string) => {
          const s = num.replace(/\D/g, '');
          let sum = 0;
          let shouldDouble = false;
          for (let i = s.length - 1; i >= 0; i--) {
            let digit = parseInt(s.charAt(i), 10);
            if (shouldDouble) {
              digit *= 2;
              if (digit > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
          }
          return sum % 10 === 0;
        };

        const cardNumberClean = cardForm.cardNumber.replace(/\s/g, '');
        if (!cardNumberClean || !luhnValid(cardNumberClean)) {
          setCardError('Número do cartão inválido');
          setProcessando(false);
          return;
        }

        const expirationParts = cardForm.cardExpiration.split('/');
        const mes = expirationParts[0];
        const ano = expirationParts[1];
        if (!mes || !ano || Number(mes) < 1 || Number(mes) > 12 || ano.length !== 2) {
          setCardError('Data de validade inválida (MM/AA)');
          setProcessando(false);
          return;
        }

        if (!/^[0-9]{3,4}$/.test(cardForm.cardCvv)) {
          setCardError('CVV inválido');
          setProcessando(false);
          return;
        }

        const cpfDigits = cardForm.docNumber.replace(/\D/g, '');
        if (!cpfDigits || cpfDigits.length !== 11) {
          setCardError('CPF inválido');
          setProcessando(false);
          return;
        }

        if (!cardForm.email || !cardForm.email.includes('@')) {
          setCardError('E-mail inválido');
          setProcessando(false);
          return;
        }

        const tokenResponse = await mpInstance.current.createCardToken({
          cardNumber: cardForm.cardNumber.replace(/\s/g, ""),
          cardholderName: cardForm.cardholderName,
          cardExpirationMonth: mes,
          cardExpirationYear: `20${ano}`,
          securityCode: cardForm.cardCvv,
          identificationType: "CPF",
          identificationNumber: cardForm.docNumber,
        });

        // Aceitar diferentes formatos de resposta do SDK e proteger contra undefined
        const tokenId = tokenResponse?.id || tokenResponse?.card?.id || tokenResponse?.card_id || tokenResponse?.token;
        if (!tokenId) {
          setCardError('Erro ao gerar token do cartão');
          setProcessando(false);
          return;
        }

        /* ===== IDENTIFICAR BANDEIRA (VISA / MASTERCARD) ===== */
        const bin = cardForm.cardNumber.replace(/\s/g, "").substring(0, 6);

        // Identificar a bandeira com proteção contra respostas indefinidas do SDK
        let paymentMethodId: string | undefined;
        try {
          const paymentMethods = await mpInstance.current.getPaymentMethods?.({ bin });
          if (paymentMethods && Array.isArray(paymentMethods.results) && paymentMethods.results.length > 0) {
            paymentMethodId = paymentMethods.results[0]?.id;
          }
        } catch (pmErr) {
          console.warn('Falha ao identificar paymentMethods:', pmErr);
          paymentMethodId = undefined;
        }

        if (!paymentMethodId) {
          setCardError('Bandeira do cartão não identificada');
          setProcessando(false);
          return;
        }

        let issuerId: string | undefined;
        try {
          const issuers = await mpInstance.current.getIssuers?.({ paymentMethodId, bin });
          if (issuers && Array.isArray(issuers.results) && issuers.results.length > 0) {
            issuerId = issuers.results[0]?.id;
          }
        } catch (issErr) {
          console.warn('Falha ao obter issuers:', issErr);
          issuerId = undefined;
        }

        const res = await fetch(
          `${API_URL}/pagamento/${pagamento._id}/cartao`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: tokenId,
              installments: parcelas,
              cpf: cardForm.docNumber,
              paymentMethodId,
              issuerId,
              email: cardForm.email,
              // Informar ao backend o cupom aplicado e o valor final visível (se houver)
              cupomId: cupomAplicado?._id || null,
              valorComCupom: cupomAplicado ? cupomAplicado.valorFinal : pagamento.valorTotal
            }),
          }
        );

        // Lê resposta do backend e mostra mensagem específica em caso de erro
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setCardError(err.error || 'Erro ao processar pagamento');
          setProcessando(false);
          return;
        }

        const data = await res.json();
        if (!data?.sucesso) {
          setCardError(data.error || 'Erro ao processar pagamento');
          setProcessando(false);
          return;
        }

        // Se o MP respondeu com status aprovado diretamente, atualizar estado local imediatamente
        if (data.status === 'approved') {
          setPagamento(p => ({ ...(p as any), status: 'Aprovado' }));
          setAguardandoConfirmacao(false);
          setProcessando(false);
          return;
        }

        // Caso contrário, aguardar confirmação via webhook/polling
        setAguardandoConfirmacao(true);
      }
    } catch (err) {
      console.error(err);

      // Ao invés de mostrar a mensagem técnica do SDK, vamos tentar consultar o status
      // do pagamento repetidamente por alguns segundos — em muitos casos o backend já
      // processou a transação e só falta o webhook/polling atualizar a UI.
      try {
        if (pagamento?._id) {
          const maxRetries = 6;
          const retryDelayMs = 2000;

          for (let i = 0; i < maxRetries; i++) {
            try {
              const statusRes = await fetch(`${API_URL}/pagamentos/${pagamento._id}`);
              if (statusRes.ok) {
                const statusData = await statusRes.json().catch(() => null);
                if (statusData && statusData.status === 'Aprovado') {
                  setPagamento(statusData);
                  setAguardandoConfirmacao(false);
                  setProcessando(false);
                  setCardError(null);
                  return; // pronto
                }
              }
            } catch (e) {
              console.warn('Tentativa de verificar status falhou (silenciosa):', e);
            }

            // aguardar antes da próxima verificação
            await new Promise(res => setTimeout(res, retryDelayMs));
          }
        }
      } catch (statusErr) {
        console.warn('Erro ao consultar status após falha no pagamento:', statusErr);
      }

      // Se não confirmou após tentativas, mostrar mensagem amigável e permitir tentar novamente
      setCardError('Erro ao processar pagamento. Se o valor foi debitado, aguarde alguns segundos e atualize a página ou contate o suporte.');
      setProcessando(false);
    }
  };

  /* ================= POLLING STATUS ================= */
  useEffect(() => {
    if (!aguardandoConfirmacao || !pagamento?._id) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/pagamentos/${pagamento._id}`);
        if (!res.ok) {
          console.warn('[DEBUG] poll /pagamentos not ok', res.status);
          return;
        }

        const data = await res.json();
        console.log('[DEBUG] poll pagamento:', data?.status);
        setPagamento(data);

        if (data.status === "Aprovado") {
          setPixData(null);
          setAguardandoConfirmacao(false);
          setProcessando(false);
        } else if (data.status && data.status !== 'Pendente') {
          // pagamento finalizado com outro status (rejeitado/cancelado)
          setAguardandoConfirmacao(false);
          setProcessando(false);
          setCardError(`Pagamento finalizado com status: ${data.status}`);
        }
      } catch (pollErr) {
        console.error('[DEBUG] erro no poll pagamento:', pollErr);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [aguardandoConfirmacao, pagamento?._id]);

  /* ================= TENTAR BUSCAR PIX AUTOMATICAMENTE (executa enquanto a página estiver montada) ================= */
  useEffect(() => {
    if (!pagamento?._id) return;
    // Só tenta quando método PIX for explicitamente selecionado
    if (metodoPagamento !== 'PIX') return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;
    const delayMs = 1500;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tryFetch = async () => {
      if (cancelled) return;
      if (pixData) return; // já obtido

      try {
        const res = await fetch(`${API_URL}/pagamento/${pagamento._id}/pix`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data && (data.qrCodeBase64 || data.copiaECola)) {
            setPixData({ qrCodeBase64: data.qrCodeBase64, copiaECola: data.copiaECola });
            setAguardandoConfirmacao(true);
            return;
          }
        }
      } catch (e) {
        // falha silenciosa — iremos tentar novamente
        console.debug('Tentativa de fetch PIX falhou (silencioso):', e);
      }

      attempts += 1;
      if (attempts < maxAttempts && !cancelled) {
        timer = setTimeout(tryFetch, delayMs);
      }
    };

    // iniciamos imediatamente
    tryFetch();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pagamento?._id, metodoPagamento]);

  /* ================= OCULTAR HEADER GLOBAL (somente nesta página) ================= */
  useEffect(() => {
    // Executa apenas no cliente
    try {
      const headerEl = document.querySelector('header');
      if (!headerEl) return;
      const previousDisplay = (headerEl as HTMLElement).style.display || '';
      (headerEl as HTMLElement).style.display = 'none';
      return () => {
        // restora quando sair da página
        (headerEl as HTMLElement).style.display = previousDisplay;
      };
    } catch (e) {
      // se qualquer erro, não bloqueia a página
      console.warn('Não foi possível ocultar o header:', e);
    }
  }, []);

  /* ================= TELAS ================= */
  if (loading)
    return (
      <div className="min-h-screen bg-app flex items-center justify-center text-app">
        Carregando...
      </div>
    );

  if (error || !pagamento)
    return (
      <div className="min-h-screen bg-app flex items-center justify-center text-red-500">
        {error}
      </div>
    );

  if (pagamento.status === "Aprovado") {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        {LoadingOverlay}
        <div className="bg-card p-8 rounded-xl text-center w-full max-w-md">
          <h1 className="text-2xl font-bold text-success mb-2">Pagamento Confirmado!</h1>
          <p className="kv-muted mt-2">Obrigado, {pagamento.clienteId.nome}.</p>
          <div className="mt-4"><Button variant="ghost" className="w-full" onClick={() => { window.location.href = '/'; }}>Voltar</Button></div>
        </div>
      </div>
    );
  }

  if (pixData && aguardandoConfirmacao) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-4">
        {LoadingOverlay}
        <div className="bg-card p-6 rounded-xl text-center w-full max-w-md">
          <h1 className="text-xl kv-accent font-semibold mb-4">Pague com PIX</h1>
          <img
            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
            className="mx-auto mb-4 w-44 h-44 object-contain img-rounded"
            alt="QR Pix"
          />
          <div className="bg-soft p-3 rounded text-sm kv-muted flex items-center justify-between gap-2">
            <div className="break-all pr-4 text-left text-sm">{pixData.copiaECola}</div>
            <button
              type="button"
              onClick={handleCopyPix}
              className="ml-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
            >
              {copiedPix ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs kv-muted mt-2">Aguardando confirmação automática…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-app p-4">
      {LoadingOverlay}
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold kv-accent mb-2">
            <img src="/logoAmarelo.png" alt="Fox Uniformes" className="mx-auto mb-2 h-12" />
          </h1>
          <p className="kv-muted">Finalize seu pagamento</p>
        </div>

        {/* Resumo do Pedido */}
        <div className="bg-card p-6 rounded-xl mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> Resumo do Pedido
          </h2>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between kv-muted">
              <span>Cliente:</span>
              <span className="text-app font-medium">{pagamento.clienteId?.nome}</span>
            </div>

            {pagamento.pedidos?.map((pedido, index) => (
              <div key={pedido._id || index} className="flex justify-between items-center py-2 border-b border-white/6">
                <div>
                  <p className="text-app">{pedido.produtoId?.name || "Produto"}</p>
                  <p className="text-sm kv-muted">Qtd: {pedido.quantidade}</p>
                </div>
                <p className="text-orange-400 font-semibold">
                  R$ {pedido.preco?.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Cupom de desconto (novo) */}
          <div className="mb-4">
            {cupomAplicado ? (
              <div className="bg-green-900/20 p-3 rounded mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Cupom aplicado: {cupomAplicado.codigo}</div>
                    <div className="text-sm kv-muted">Desconto: {cupomAplicado.desconto}% — R$ {cupomAplicado.valorDesconto?.toFixed(2)}</div>
                  </div>
                  <button className="text-sm text-red-400" onClick={() => { setCupomAplicado(null); setCodigoCupom(''); setErroCupom(null); }}>
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Código do cupom"
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-3 focus:outline-none"
                  value={codigoCupom}
                  onChange={e => setCodigoCupom(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (!codigoCupom.trim()) { setErroCupom('Digite um código de cupom'); return; }
                    setValidandoCupom(true); setErroCupom(null);
                    try {
                      const resp = await fetch(`${API_URL}/cupons/validar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ codigo: codigoCupom, valorPedido: pagamento.valorTotal, clienteId: pagamento.clienteId?._id })
                      });
                      const data = await resp.json();
                      if (data.valido) {
                        // normalizar resposta do backend para o formato usado aqui
                        const cup = data.cupom || data;
                        const valorDesconto = (pagamento.valorTotal * (cup.desconto || 0)) / 100;
                        const valorFinal = pagamento.valorTotal - valorDesconto;
                        setCupomAplicado({ _id: cup._id || cup.id, codigo: cup.codigo || codigoCupom, desconto: cup.desconto || 0, valorDesconto, valorFinal });
                        setErroCupom(null);
                      } else {
                        setErroCupom(data.mensagem || 'Cupom inválido');
                        setCupomAplicado(null);
                      }
                    } catch (e) {
                      console.error('Erro ao validar cupom:', e);
                      setErroCupom('Erro ao validar cupom');
                    } finally {
                      setValidandoCupom(false);
                    }
                  }}
                  className="px-4 py-3 bg-blue-600 rounded-md text-white"
                >{validandoCupom ? 'Validando...' : 'Aplicar'}</button>
              </div>
            )}
            {erroCupom && <div className="text-red-400 text-sm mt-2">{erroCupom}</div>}
          </div>

          <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-gray-600">
            <span>Total:</span>
            <span className="text-green-400">R$ {(cupomAplicado ? cupomAplicado.valorFinal : pagamento.valorTotal)?.toFixed(2)}</span>
          </div>
        </div>

        {/* Método de Pagamento */}
        <div className="bg-card p-6 rounded-xl mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>💳</span> Forma de Pagamento
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* PIX */}
            <Button
              onClick={() => setMetodoPagamento("PIX")}
              variant="ghost"
              className={`p-4 ${metodoPagamento === "PIX" ? "border-green-500 bg-green-500/10" : "border-gray-600 hover:border-gray-500"} border-2`}
            >
              <div className="text-3xl mb-2">💚</div>
              <p className="font-semibold">PIX</p>
              <p className="text-sm kv-muted">Aprovação instantânea</p>
            </Button>

            {/* Cartão */}
            <Button
              onClick={() => setMetodoPagamento("CREDIT_CARD")}
              variant="ghost"
              className={`p-4 ${metodoPagamento === "CREDIT_CARD" ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"} border-2`}
            >
              <div className="text-3xl mb-2">💳</div>
              <p className="font-semibold">Cartão de Crédito</p>
              <p className="text-sm kv-muted">Até 12x</p>
            </Button>
          </div>

          {/* Opções de Parcelamento (apenas para cartão) */}
          {metodoPagamento === "CREDIT_CARD" && (
            <div className="mb-6">
              <label className="block text-sm kv-muted mb-2">Parcelas</label>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(parseInt(e.target.value))}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>
                  1x de R$ {(cupomAplicado ? cupomAplicado.valorFinal : pagamento.valorTotal)?.toFixed(2)} (sem juros)
                </option>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={num}>
                    {num}x de R$ {calcularParcela((cupomAplicado ? cupomAplicado.valorFinal : pagamento.valorTotal) || 0, num).toFixed(2)}
                    {num > 1 && " (com juros)"}
                  </option>
                ))}
              </select>
              {parcelas > 1 && (
                <p className="text-xs kv-muted mt-2">
                  Total com juros: R$ {(calcularParcela((cupomAplicado ? cupomAplicado.valorFinal : pagamento.valorTotal) || 0, Number(parcelas)) * Number(parcelas)).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Info PIX */}
          {metodoPagamento === "PIX" && (
            <div className="bg-green-900/30 p-4 rounded-lg border border-green-500/30 mb-6">
              <p className="text-sm text-green-300">
                ✅ Com PIX você paga à vista e a aprovação é instantânea!
              </p>
            </div>
          )}
        </div>

        {/* Formulário Cartão */}
        {metodoPagamento === "CREDIT_CARD" && (
          <div className="bg-card p-6 rounded-xl mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>💳</span> Dados do Cartão
            </h2>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Número do cartão"
                className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={19}
                value={cardForm.cardNumber}
                onChange={e => setCardForm(f => ({ ...f, cardNumber: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Nome impresso no cartão"
                className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cardForm.cardholderName}
                onChange={e => setCardForm(f => ({ ...f, cardholderName: e.target.value }))}
              />
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="MM/AA"
                  className="w-1/2 bg-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={5}
                  value={cardForm.cardExpiration}
                  onChange={e => setCardForm(f => ({ ...f, cardExpiration: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="CVV"
                  className="w-1/2 bg-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={4}
                  value={cardForm.cardCvv}
                  onChange={e => setCardForm(f => ({ ...f, cardCvv: e.target.value }))}
                />
              </div>
              <input
                type="text"
                placeholder="CPF do titular"
                className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cardForm.docNumber}
                onChange={e => setCardForm(f => ({ ...f, docNumber: e.target.value }))}
              />
              <input
                type="email"
                placeholder="Email do titular"
                className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cardForm.email}
                onChange={e => setCardForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            {cardError && <div className="text-red-400 text-sm mb-2">{cardError}</div>}
          </div>
        )}

        {/* Botão Pagar */}
        <Button
          onClick={handlePagar}
          disabled={processando || !metodoPagamento}
          variant={metodoPagamento === "PIX" ? "gold" : "cta"}
          className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processando ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
              Processando...
            </>
          ) : (
            <>{metodoPagamento === "PIX" ? "💚 Pagar com PIX" : (metodoPagamento === "CREDIT_CARD" ? "💳 Pagar com Cartão" : 'Selecione forma de pagamento')}</>
          )}
        </Button>

        {/* Segurança */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>🔒 Pagamento 100% seguro</p>
          <p className="mt-1">Seus dados estão protegidos</p>
        </div>
      </div>
    </div>
  );
}
