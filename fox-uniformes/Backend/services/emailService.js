import { Resend } from 'resend';
import fs from 'fs';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM =
  process.env.EMAIL_FROM || 'Fox Uniformes <onboarding@resend.dev>';

/**
 * Envia e-mail com link de pagamento / PIX
 */
const enviarLinkPagamento = async ({
  para,
  nome,
  valorTotal,
  linkPagamento,
  pixCopiaECola,
}) => {
  console.log('[DEBUG] Função enviarLinkPagamento chamada', { para });
  console.log('[EMAIL] Envio link pagamento:', {
    para,
    valorTotal,
    linkPagamento,
    pixCopiaECola,
  });

  if (!para) {
    console.warn('[EMAIL] Cliente sem e-mail, envio ignorado');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Olá, ${nome} 👋</h2>

      <p>Recebemos seu pedido. O pagamento ainda está pendente.</p>

      <p><strong>Valor:</strong> R$ ${valorTotal.toFixed(2)}</p>

      ${
        linkPagamento
          ? `
        <p>Clique no botão abaixo para pagar:</p>
        <a href="${linkPagamento}"
           style="
             display:inline-block;
             padding:12px 20px;
             background:#22c55e;
             color:#fff;
             text-decoration:none;
             border-radius:6px;
           ">
          Pagar agora
        </a>
      `
          : ''
      }

      ${
        pixCopiaECola
          ? `
        <hr />
        <p><strong>PIX Copia e Cola:</strong></p>
        <p style="
          background:#f4f4f4;
          padding:10px;
          word-break:break-all;
          font-size:13px;
        ">
          ${pixCopiaECola}
        </p>
      `
          : ''
      }

      <hr />

      <p style="font-size:12px;color:#777;">
        Fox Uniformes • Este é um e-mail automático
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: para,
      subject: '🦊 Fox Uniformes - Link de Pagamento',
      html,
    });

    console.log(`📧 Link de pagamento enviado para ${para}`);
  } catch (err) {
    console.error('❌ Erro ao enviar e-mail de pagamento:', err);
  }
};

/**
 * Envia e-mail com NOTA FISCAL em PDF (pagamento aprovado)
 */
const enviarNotaFiscal = async ({
  para,
  nome,
  numeroNota,
  caminhoPdf,
  linkAcompanhamento,
}) => {
  console.log('[EMAIL] Envio nota fiscal:', {
    para,
    numeroNota,
    caminhoPdf,
    linkAcompanhamento,
  });

  if (!para) {
    console.warn('[EMAIL] Cliente sem e-mail, envio ignorado');
    return;
  }

  try {
    // Lê o PDF já gerado
    const pdfBuffer = fs.readFileSync(caminhoPdf);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Olá, ${nome} 👋</h2>

        <p>Seu pagamento foi <strong>confirmado com sucesso</strong> 🎉</p>

        <p>
          Em anexo está a sua <strong>Nota Fiscal Nº ${numeroNota}</strong>.
        </p>

        <p>
          Guarde este documento para seus registros.
        </p>

        ${
          linkAcompanhamento
            ? `
          <hr />
          <p>Você pode acompanhar o status do seu pedido pelo link abaixo:</p>
          <a href="${linkAcompanhamento}"
             style="
               display:inline-block;
               padding:10px 18px;
               background:#2563eb;
               color:#fff;
               text-decoration:none;
               border-radius:6px;
               margin-top:8px;
             ">
            Acompanhar Pedido
          </a>
        `
            : ''
        }

        <hr />

        <p style="font-size:12px;color:#777;">
          Fox Uniformes • Este é um e-mail automático
        </p>
      </div>
    `;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: para,
      subject: `🧾 Nota Fiscal - Nº ${numeroNota}`,
      html,
      attachments: [
        {
          filename: `nota_fiscal_${numeroNota}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log(`📧 Nota fiscal enviada para ${para}`);
  } catch (err) {
    console.error('❌ Erro ao enviar nota fiscal por e-mail:', err);
    throw err;
  }
};

/**
 * Envia e-mail com CUPOM para o cliente
 */
const enviarCupom = async ({
  para,
  nome,
  codigoCupom,
  valorCupom,
  validadeCupom,
  linkCompra,
}) => {
  console.log('[EMAIL] Envio cupom:', {
    para,
    codigoCupom,
    valorCupom,
    validadeCupom,
    linkCompra,
  });

  if (!para) {
    console.warn('[EMAIL] Cliente sem e-mail, envio ignorado');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Olá, ${nome} 👋</h2>

      <p>Você recebeu um <strong>CUPOM DE DESCONTO</strong> para usar na Fox Uniformes!</p>

      <p><strong>Código do Cupom:</strong> <span style="background:#f4f4f4;padding:4px 8px;border-radius:4px;font-weight:bold;">${codigoCupom}</span></p>
      <p><strong>Valor:</strong> R$ ${valorCupom.toFixed(2)}</p>
      <p><strong>Validade:</strong> ${validadeCupom}</p>

      ${
        linkCompra
          ? `
        <a href="${linkCompra}"
           style="
             display:inline-block;
             padding:12px 20px;
             background:#22c55e;
             color:#fff;
             text-decoration:none;
             border-radius:6px;
             margin-top:10px;
           ">
          Usar Cupom Agora
        </a>
      `
          : ''
      }

      <hr />
      <p style="font-size:12px;color:#777;">
        Fox Uniformes • Este é um e-mail automático
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: para,
      subject: '🦊 Fox Uniformes - Cupom de Desconto',
      html,
    });
    console.log(`📧 Cupom enviado para ${para}`);
  } catch (err) {
    console.error('❌ Erro ao enviar e-mail de cupom:', err);
  }
};

export default {
  enviarLinkPagamento,
  enviarNotaFiscal,
  enviarCupom,
};
