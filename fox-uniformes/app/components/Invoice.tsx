import React from 'react';

type Cliente = {
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cep?: string;
};

type Item = {
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
};

type Nota = {
  numeroNota: string;
  dataEmissao: string;
  cliente: Cliente;
  itens: Item[];
  valorTotal: number;
  formaPagamento: string;
  parcelas?: number;
};

export default function Invoice({ nota }: { nota: Nota }) {
  return (
    <div className="max-w-4xl mx-auto bg-white p-10 text-gray-800 text-sm font-sans">

      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center border-b pb-6 mb-6">
        <img
          src="/logoPreto.png"
          alt="Logo da empresa"
          className="h-16 object-contain"
        />

        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-wide">
            NOTA FISCAL
          </h1>

          <p className="text-xs text-gray-600 mt-1">
            Nº <span className="font-semibold">{nota.numeroNota}</span>
          </p>

          <p className="text-xs text-gray-600">
            Emitida em {nota.dataEmissao}
          </p>
        </div>
      </div>

      {/* ================= EMITENTE ================= */}
      <section className="mb-6">
        <h2 className="font-semibold mb-2 text-gray-700">
          DADOS DO EMITENTE
        </h2>

        <p>
          <span className="font-medium">FOX UNIFORMES</span><br />
          CNPJ: 99.999.999/9999-99<br />
          Rua de maluco, nº 69 – Centro<br />
          Palmeira das Missões – RS<br />
          CEP: 99999-999
        </p>
      </section>

      {/* ================= CLIENTE ================= */}
      <section className="mb-6">
        <h2 className="font-semibold mb-2 text-gray-700">
          DADOS DO CLIENTE
        </h2>

        <p>
          <span className="font-medium">{nota.cliente?.nome || 'Cliente'}</span><br />
          {nota.cliente?.cpf && <>CPF: {nota.cliente.cpf}<br /></>}
          {nota.cliente?.telefone && <>Telefone: {nota.cliente.telefone}<br /></>}
          {nota.cliente?.email && <>Email: {nota.cliente.email}<br /></>}
          {nota.cliente?.endereco && <>Endereço: {nota.cliente.endereco}<br /></>}
          {nota.cliente?.cep && <>CEP: {nota.cliente.cep}</>}
        </p>
      </section>

      {/* ================= ITENS ================= */}
      <section className="mb-6">
        <h2 className="font-semibold mb-3 text-gray-700">
          ITENS DO PEDIDO
        </h2>

        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-left">Produto</th>
              <th className="p-2 border text-center">Qtd</th>
              <th className="p-2 border text-right">Unitário</th>
              <th className="p-2 border text-right">Total</th>
            </tr>
          </thead>

          <tbody>
            {nota.itens?.map((item, index) => (
              <tr key={index}>
                <td className="p-2 border">
                  {item.produtoNome}
                </td>

                <td className="p-2 border text-center">
                  {item.quantidade}
                </td>

                <td className="p-2 border text-right">
                  R$ {item.precoUnitario.toFixed(2)}
                </td>

                <td className="p-2 border text-right font-medium">
                  R$ {item.precoTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ================= TOTAIS ================= */}
      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total</span>
            <span>R$ {nota.valorTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Forma de pagamento</span>
            <span className="uppercase">{nota.formaPagamento}</span>
          </div>

          {nota.parcelas && nota.parcelas > 1 && (
            <div className="flex justify-between">
              <span>Parcelas</span>
              <span>{nota.parcelas}x</span>
            </div>
          )}

          <div className="flex justify-between border-t pt-2 font-bold text-base">
            <span>Total Pago</span>
            <span>R$ {nota.valorTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ================= RODAPÉ ================= */}
      <div className="border-t pt-4 text-xs text-gray-500 text-center">
        <p>
          Pagamento confirmado. Este documento é uma representação fiscal simplificada.
        </p>
        <p>
          Agradecemos pela preferência.
        </p>
      </div>

    </div>
  );
}
