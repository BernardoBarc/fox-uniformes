import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM =
  process.env.EMAIL_FROM || 'Fox Uniformes <onboarding@resend.dev>';

const enviarLinkPagamento = async ({
  para,
  nome,
  valorTotal,
  linkPagamento,
  pixCopiaECola,
}) => {
  console.log('[EMAIL] Payload recebido para envio:', { para, nome, valorTotal, linkPagamento, pixCopiaECola });
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

    console.log(`📧 E-mail de pagamento enviado para ${para}`);
  } catch (err) {
    console.error('❌ Erro ao enviar e-mail:', err);
  }
};

export default {
  enviarLinkPagamento,
};
