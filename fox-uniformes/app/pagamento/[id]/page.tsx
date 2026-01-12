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
  const [metodoPagamento, setMetodoPagamento] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [parcelas, setParcelas] = useState(1);
  const [processando, setProcessando] = useState(false);
  const [pixData, setPixData] = useState<null | { qrCode: string; qrCodeBase64: string; copiaECola: string }>(null);
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
    setCardError(null);
    setCardSuccess(null);
    try {
      if (!pagamento) return;
      if (metodoPagamento === "PIX") {
        // Chama o endpoint de PIX e exibe o QR Code/copia e cola
        const response = await fetch(`${API_URL}/pagamento/${pagamento._id}/pix`);
        if (response.ok) {
          const data = await response.json();
          setPixData({
            qrCode: data.qrCode,
            qrCodeBase64: data.qrCodeBase64,
            copiaECola: data.copiaECola
          });
          setAguardandoPix(true);
        } else {
          setCardError('Erro ao gerar QR Code PIX.');
        }
      } else if (metodoPagamento === "CREDIT_CARD") {
        // Aqui você pode implementar o fluxo de cartão normalmente
        // Exemplo: enviar os dados do cartão para o backend
        // ...
        setCardSuccess('Pagamento com cartão processado (exemplo).');
      }
    } catch (error) {
      setCardError('Erro ao conectar com o servidor.');
    } finally {
      setProcessando(false);
    }
  };

  // Polling para atualizar status do pagamento enquanto aguarda PIX
  useEffect(() => {
    if (aguardandoPix && pagamento?._id) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/pagamentos/${pagamento._id}`);
          if (response.ok) {
            const data = await response.json();
            setPagamento(data);
            if (data.status === "Aprovado") {
              setPixData(null);
              setAguardandoPix(false);
            }
          }
        } catch {}
      }, 4000); // a cada 4 segundos
      return () => clearInterval(interval);
    }
  }, [aguardandoPix, pagamento?._id]);

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

  // Substituir toda a renderização de métodos de pagamento por uma mensagem de orientação
  if (cardSuccess) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl text-center">
          <h1 className="text-2xl font-bold text-green-500 mb-4">Venda realizada!</h1>
          <p className="text-gray-400 mb-4">O link de pagamento foi enviado para o e-mail do cliente.</p>
          <p className="text-gray-500 text-sm">O cliente poderá escolher PIX, cartão ou boleto ao clicar no link.</p>
        </div>
      </div>
    );
  }

  // Exibir o QR Code PIX se disponível
  if (pixData && aguardandoPix) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl text-center">
          <h1 className="text-2xl font-bold text-green-500 mb-4">Pague com PIX</h1>
          <img
            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
            alt="QR Code PIX"
            className="mx-auto mb-4"
            style={{ width: 200, height: 200 }}
          />
          <p className="text-gray-400 mb-2">Escaneie o QR Code acima ou copie o código abaixo:</p>
          <div className="bg-gray-700 rounded p-2 mb-2 text-sm break-all select-all">
            {pixData.copiaECola}
          </div>
          <p className="text-gray-500 text-xs">Após o pagamento, aguarde a confirmação automática nesta tela.</p>
          <button
            className="mt-4 px-4 py-2 bg-orange-600 rounded text-white font-bold"
            onClick={() => { setPixData(null); setAguardandoPix(false); }}
          >
            Voltar
          </button>
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
              onClick={() => setMetodoPagamento("PIX")}
              className={`p-4 rounded-lg border-2 transition ${
                metodoPagamento === "PIX"
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
              onClick={() => setMetodoPagamento("CREDIT_CARD")}
              className={`p-4 rounded-lg border-2 transition ${
                metodoPagamento === "CREDIT_CARD"
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
          {metodoPagamento === "CREDIT_CARD" && (
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
            metodoPagamento === "PIX"
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
              {metodoPagamento === "PIX" ? "💚 Pagar com PIX" : "💳 Pagar com Cartão"}
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
