"use client";
import React, { useEffect, useState } from "react";
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

export default function PagamentoPage() {
  const params = useParams();
  const pagamentoId = params.id as string;
  
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [parcelas, setParcelas] = useState(1);
  const [processando, setProcessando] = useState(false);

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

  const calcularParcela = (valor: number, numParcelas: number) => {
    // Juros simples de 2.99% ao mês para cartão
    const juros = numParcelas > 1 ? 0.0299 : 0;
    const valorComJuros = valor * (1 + juros * numParcelas);
    return valorComJuros / numParcelas;
  };

  const handlePagar = async () => {
    setProcessando(true);
    
    try {
      // Confirmar pagamento (em produção, isso seria feito após o gateway confirmar)
      const response = await fetch(`${API_URL}/pagamento/${pagamentoId}/confirmar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metodoPagamento: metodoPagamento === 'pix' ? 'PIX' : 'Cartão de Crédito',
          parcelas: metodoPagamento === 'cartao' ? parcelas : 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Atualizar estado local
        setPagamento(prev => prev ? { ...prev, status: 'Aprovado' } : null);
        
        // Mostrar mensagem de sucesso
        alert(`✅ Pagamento confirmado com sucesso!\n\n📄 Nota Fiscal: ${data.notaFiscal?.numero || 'Gerada'}\n\nVocê receberá a nota fiscal via WhatsApp em instantes.`);
      } else {
        const errorData = await response.json();
        alert(`❌ Erro ao processar pagamento: ${errorData.error || 'Tente novamente'}`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('❌ Erro ao conectar com o servidor. Tente novamente.');
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
                  Total com juros: R$ {(calcularParcela(pagamento.valorTotal, parcelas) * parcelas).toFixed(2)}
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
