"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "../../config/api";

interface Pedido {
  _id: string;
  nomeCliente: string;
  produtoId: {
    name: string;
    preco: number;
  };
  quantidade: number;
  preco: number;
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
  linkPagamento?: string;
  createdAt: string;
}

// Adicionar tipagem global para MercadoPago
// @ts-ignore
// eslint-disable-next-line
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
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [parcelas, setParcelas] = useState(1);
  const [processando, setProcessando] = useState(false);
  const [pixData, setPixData] = useState<null | { qr_code: string; qr_code_base64: string; copia_cola: string }>(null);
  const [aguardandoPix, setAguardandoPix] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    cardholderName: "",
    cardExpiration: "",
    cardCvv: "",
    docType: "CPF",
    docNumber: "",
    email: "",
  });
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState<string | null>(null);
  const mpInstance = useRef<any>(null);

  useEffect(() => {
    const fetchPagamento = async () => {
      try {
        const response = await fetch(`${API_URL}/pagamentos/${pagamentoId}`);
        if (response.ok) {
          const data = await response.json();
          setPagamento(data);
        } else {
          setError("Pagamento não encontrado");
        }
      } catch (err) {
        setError("Erro ao carregar dados do pagamento");
      } finally {
        setLoading(false);
      }
    };

    if (pagamentoId) {
      fetchPagamento();
    }
  }, [pagamentoId]);

  // Carregar SDK Mercado Pago
  useEffect(() => {
    if (typeof window !== "undefined" && !window.MercadoPago) {
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.onload = () => {
        mpInstance.current = new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "APP_USR-8613dbee-001e-4831-9be8-3ae81c744075");
      };
      document.body.appendChild(script);
    } else if (window.MercadoPago) {
      mpInstance.current = new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "APP_USR-8613dbee-001e-4831-9be8-3ae81c744075");
    }
  }, []);

  const calcularParcela = (valor: number, numParcelas: number) => {
    // Juros simples de 2.99% ao mês para cartão
    const juros = numParcelas > 1 ? 0.0299 : 0;
    const valorComJuros = valor * (1 + juros * numParcelas);
    return valorComJuros / numParcelas;
  };

  const handlePagar = async () => {
    setProcessando(true);
    setAguardandoPix(false);
    setPixData(null);
    setCardError(null);
    setCardSuccess(null);
    try {
      if (metodoPagamento === 'pix') {
        if (!pagamento) return;
        const response = await fetch(`${API_URL}/pagamento/criar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: pagamento.clienteId,
            pedidos: pagamento.pedidos.map(p => p._id),
            valorTotal: pagamento.valorTotal,
            telefone: pagamento.clienteId?.telefone,
            nomeCliente: pagamento.clienteId?.nome,
            metodoPagamento: 'PIX',
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.pixData) {
            setPixData(data.pixData);
            setAguardandoPix(true);
          } else {
            alert('Erro ao gerar cobrança PIX. Tente novamente.');
          }
        } else {
          alert('Erro ao gerar cobrança PIX.');
        }
      } else if (metodoPagamento === 'cartao') {
        if (!pagamento) return;
        if (!mpInstance.current) {
          setCardError("Erro ao carregar Mercado Pago. Tente novamente.");
          setProcessando(false);
          return;
        }
        // Validação básica
        if (!cardForm.cardNumber || !cardForm.cardholderName || !cardForm.cardExpiration || !cardForm.cardCvv || !cardForm.docNumber || !cardForm.email) {
          setCardError("Preencha todos os campos do cartão.");
          setProcessando(false);
          return;
        }
        // Gerar token do cartão
        const [expMonth, expYear] = cardForm.cardExpiration.split("/").map(s => s.trim());
        const cardTokenResult = await mpInstance.current.createCardToken({
          cardNumber: cardForm.cardNumber.replace(/\s/g, ""),
          cardholderName: cardForm.cardholderName,
          cardExpirationMonth: expMonth,
          cardExpirationYear: expYear,
          securityCode: cardForm.cardCvv,
          identificationType: cardForm.docType,
          identificationNumber: cardForm.docNumber,
        });
        if (!cardTokenResult.id) {
          setCardError("Erro ao gerar token do cartão. Verifique os dados.");
          setProcessando(false);
          return;
        }
        // Enviar para backend
        const response = await fetch(`${API_URL}/pagamento/criar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: pagamento.clienteId,
            pedidos: pagamento.pedidos.map(p => p._id),
            valorTotal: pagamento.valorTotal,
            telefone: pagamento.clienteId?.telefone,
            nomeCliente: pagamento.clienteId?.nome,
            metodoPagamento: 'CREDIT_CARD',
            cardToken: cardTokenResult.id,
            installments: parcelas,
            payer: {
              email: cardForm.email,
              identification: {
                type: cardForm.docType,
                number: cardForm.docNumber,
              },
              first_name: pagamento.clienteId?.nome,
              last_name: '',
            },
          }),
        });
        if (response.ok) {
          setCardSuccess("Pagamento processado! Aguarde confirmação.");
        } else {
          setCardError("Erro ao processar pagamento com cartão.");
        }
      } else {
        alert('Selecione uma forma de pagamento.');
      }
    } catch (error) {
      setCardError('Erro ao conectar com o servidor.');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (error || !pagamento) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Erro</h1>
          <p className="text-gray-400">{error || "Pagamento não encontrado"}</p>
        </div>
      </div>
    );
  }

  if (pagamento.status === "Aprovado") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-500 mb-4">Pagamento Confirmado!</h1>
          <p className="text-gray-400 mb-4">
            Obrigado, {pagamento.clienteId?.nome}! Seu pagamento foi processado com sucesso.
          </p>
          <p className="text-gray-500 text-sm">
            Seu pedido está sendo preparado e em breve você receberá atualizações.
          </p>
        </div>
      </div>
    );
  }

  if (aguardandoPix && pixData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl text-center max-w-md">
          <h1 className="text-2xl font-bold text-green-400 mb-4">Pagamento via PIX</h1>
          <p className="mb-4 text-gray-300">Escaneie o QR Code abaixo ou copie a chave para pagar:</p>
          <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="mx-auto mb-4 w-56 h-56 rounded-lg border-4 border-green-500" />
          <div className="bg-gray-700 rounded-lg p-3 mb-4">
            <span className="block text-xs text-gray-400 mb-1">Chave copia e cola:</span>
            <span className="text-green-300 break-all select-all text-sm">{pixData.copia_cola}</span>
          </div>
          <p className="text-gray-400 mb-2">Após o pagamento, a confirmação é automática!</p>
          <p className="text-gray-500 text-xs">Se já pagou, aguarde alguns segundos e recarregue a página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">🦊 Fox Uniformes</h1>
          <p className="text-gray-400">Finalize seu pagamento</p>
        </div>

        {/* Resumo do Pedido */}
        <div className="bg-gray-800 p-6 rounded-xl mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> Resumo do Pedido
          </h2>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-gray-400">
              <span>Cliente:</span>
              <span className="text-white">{pagamento.clienteId?.nome}</span>
            </div>
            
            {pagamento.pedidos?.map((pedido, index) => (
              <div key={pedido._id || index} className="flex justify-between items-center py-2 border-b border-gray-700">
                <div>
                  <p className="text-white">{pedido.produtoId?.name || "Produto"}</p>
                  <p className="text-sm text-gray-400">Qtd: {pedido.quantidade}</p>
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
        <div className="bg-gray-800 p-6 rounded-xl mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>💳</span> Forma de Pagamento
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* PIX */}
            <button
              onClick={() => setMetodoPagamento("pix")}
              className={`p-4 rounded-lg border-2 transition ${
                metodoPagamento === "pix"
                  ? "border-green-500 bg-green-500/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <div className="text-3xl mb-2">💚</div>
              <p className="font-semibold">PIX</p>
              <p className="text-sm text-gray-400">Aprovação instantânea</p>
            </button>

            {/* Cartão */}
            <button
              onClick={() => setMetodoPagamento("cartao")}
              className={`p-4 rounded-lg border-2 transition ${
                metodoPagamento === "cartao"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <div className="text-3xl mb-2">💳</div>
              <p className="font-semibold">Cartão de Crédito</p>
              <p className="text-sm text-gray-400">Até 12x</p>
            </button>
          </div>

          {/* Opções de Parcelamento (apenas para cartão) */}
          {metodoPagamento === "cartao" && (
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Parcelas</label>
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
                <p className="text-xs text-gray-500 mt-2">
                  Total com juros: R$ {(calcularParcela(pagamento.valorTotal, Number(parcelas)) * Number(parcelas)).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Info PIX */}
          {metodoPagamento === "pix" && (
            <div className="bg-green-900/30 p-4 rounded-lg border border-green-500/30 mb-6">
              <p className="text-sm text-green-300">
                ✅ Com PIX você paga à vista e a aprovação é instantânea!
              </p>
            </div>
          )}
        </div>

        {/* Formulário Cartão */}
        {metodoPagamento === "cartao" && (
          <div className="bg-gray-800 p-6 rounded-xl mb-6">
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
            {cardSuccess && <div className="text-green-400 text-sm mb-2">{cardSuccess}</div>}
          </div>
        )}

        {/* Botão Pagar */}
        <button
          onClick={handlePagar}
          disabled={processando}
          className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 ${
            metodoPagamento === "pix"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {processando ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
              Processando...
            </>
          ) : (
            <>
              {metodoPagamento === "pix" ? "💚 Pagar com PIX" : "💳 Pagar com Cartão"}
            </>
          )}
        </button>

        {/* Segurança */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>🔒 Pagamento 100% seguro</p>
          <p className="mt-1">Seus dados estão protegidos</p>
        </div>
      </div>
    </div>
  );
}
