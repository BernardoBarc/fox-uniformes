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

  const [metodoPagamento, setMetodoPagamento] =
    useState<"PIX" | "CREDIT_CARD">("PIX");

  const [parcelas, setParcelas] = useState(1);
  const [processando, setProcessando] = useState(false);

  const [pixData, setPixData] = useState<null | {
    qrCodeBase64: string;
    copiaECola: string;
  }>(null);

  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    cardholderName: "",
    cardExpiration: "",
    cardCvv: "",
    docNumber: "",
    email: "",
  });

  const [cardError, setCardError] = useState<string | null>(null);

  const mpInstance = useRef<any>(null);

  // Overlay de loading global para indicar processamento de pagamento
  // Mantém o overlay enquanto processando ou aguardando confirmação via webhook
  const loadingMessage = (processando || aguardandoConfirmacao)
    ? (metodoPagamento === 'CREDIT_CARD' ? 'Processando pagamento com cartão...' : 'Processando pagamento...')
    : null;

  const LoadingOverlay = (processando || aguardandoConfirmacao) ? (
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

    setProcessando(true);
    setCardError(null);

    try {
      /* ---------- PIX ---------- */
      if (metodoPagamento === "PIX") {
        const res = await fetch(
          `${API_URL}/pagamento/${pagamento._id}/pix`
        );
        if (!res.ok) throw new Error();

        const data = await res.json();
        setPixData({
          qrCodeBase64: data.qrCodeBase64,
          copiaECola: data.copiaECola,
        });
        setAguardandoConfirmacao(true);
      }

      /* ---------- CARTÃO ---------- */
      if (metodoPagamento === "CREDIT_CARD") {
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

        if (!tokenResponse?.id) {
          setCardError('Erro ao gerar token do cartão');
          setProcessando(false);
          return;
        }

        /* ===== IDENTIFICAR BANDEIRA (VISA / MASTERCARD) ===== */
        const bin = cardForm.cardNumber.replace(/\s/g, "").substring(0, 6);

        const paymentMethods = await mpInstance.current.getPaymentMethods({ bin });
        const paymentMethodId = paymentMethods?.results?.[0]?.id;

        if (!paymentMethodId) {
          throw new Error("Bandeira do cartão não identificada");
        }

        let issuerId: string | undefined;

        try {
          const issuers = await mpInstance.current.getIssuers({
            paymentMethodId,
            bin,
        });

          issuerId = issuers?.results?.[0]?.id;
        } catch {
          issuerId = undefined;
        }

        const res = await fetch(
          `${API_URL}/pagamento/${pagamento._id}/cartao`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: tokenResponse.id,
              installments: parcelas,
              cpf: cardForm.docNumber,
              paymentMethodId,
              issuerId,
              email: cardForm.email,
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

        // Aguarda confirmação via webhook (mantém overlay)
        setAguardandoConfirmacao(true);
      }
    } catch (err) {
      console.error(err);
      // normaliza erro para evitar problemas de tipagem no TypeScript
      setCardError((err as any)?.message || 'Erro ao processar pagamento.');
      setProcessando(false);
    }
  };

  /* ================= POLLING STATUS ================= */
  useEffect(() => {
    if (!aguardandoConfirmacao || !pagamento?._id) return;

    const interval = setInterval(async () => {
      const res = await fetch(`${API_URL}/pagamentos/${pagamento._id}`);
      if (!res.ok) return;

      const data = await res.json();
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
    }, 4000);

    return () => clearInterval(interval);
  }, [aguardandoConfirmacao, pagamento?._id]);

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
          <div className="bg-soft p-3 rounded text-sm break-all kv-muted">
            {pixData.copiaECola}
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
          <h1 className="text-3xl font-bold kv-accent mb-2">🦊 Fox Uniformes</h1>
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

          <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-gray-600">
            <span>Total:</span>
            <span className="text-green-400">R$ {pagamento.valorTotal?.toFixed(2)}</span>
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
                  1x de R$ {pagamento.valorTotal?.toFixed(2)} (sem juros)
                </option>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={num}>
                    {num}x de R$ {calcularParcela(pagamento.valorTotal, num).toFixed(2)}
                    {num > 1 && " (com juros)"}
                  </option>
                ))}
              </select>
              {parcelas > 1 && (
                <p className="text-xs kv-muted mt-2">
                  Total com juros: R$ {(calcularParcela(pagamento.valorTotal, Number(parcelas)) * Number(parcelas)).toFixed(2)}
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
          disabled={processando}
          variant={metodoPagamento === "PIX" ? "gold" : "cta"}
          className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processando ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
              Processando...
            </>
          ) : (
            <>{metodoPagamento === "PIX" ? "💚 Pagar com PIX" : "💳 Pagar com Cartão"}</>
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
