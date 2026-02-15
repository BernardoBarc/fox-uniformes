import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM =
  process.env.EMAIL_FROM || 'Fox Uniformes <onboarding@resend.dev>';

// URL pública onde o frontend serve os assets (ex.: https://meusite.com)
const LOGO_URL = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/logoAmarelo.png` : null;

// Tenta ler a logo local em /public e criar uma data URI caso não exista FRONTEND_URL
let LOGO_DATA_URI = null;
try {
  const localLogoPath = path.join(process.cwd(), 'public', 'logoAmarelo.png');
  if (!LOGO_URL && fs.existsSync(localLogoPath)) {
    const buf = fs.readFileSync(localLogoPath);
    LOGO_DATA_URI = `data:image/png;base64,${buf.toString('base64')}`;
  }
} catch (e) {
  console.warn('[EMAIL] Não foi possível ler logo local:', e && e.message ? e.message : e);
}

const LOGO_IMG_HTML = LOGO_URL
  ? `<img src="${LOGO_URL}" alt="Fox Uniformes" style="height:48px;display:inline-block;" />`
  : (LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="Fox Uniformes" style="height:48px;display:inline-block;" />` : '');

/**
 * Envia e-mail com link de pagamento / PIX
 */
const enviarLinkPagamento = async ({
  para,
  nome,
  valorTotal,
  linkPagamento,
  pixCopiaECola
}) => {
  console.log('[DEBUG] Função enviarLinkPagamento chamada', { para });
  console.log('[EMAIL] Envio link pagamento:', {
    para,
    valorTotal,
    linkPagamento,
    pixCopiaECola
  });

  if (!para) {
    console.warn('[EMAIL] Cliente sem e-mail, envio ignorado');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <div style="text-align:center;margin-bottom:12px;">
        ${LOGO_IMG_HTML}
      </div>
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
      subject: 'Fox Uniformes - Link de Pagamento',
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
  linkAcompanhamento
}) => {
  console.log('[EMAIL] Envio nota fiscal:', {
    para,
    numeroNota,
    caminhoPdf,
    linkAcompanhamento
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
        <div style="text-align:center;margin-bottom:12px;">
          ${LOGO_IMG_HTML}
        </div>
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
      subject: `Nota Fiscal - Nº ${numeroNota}`,
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
  desconto = 0
}) => {
  console.log('[EMAIL] Envio cupom:', {
    para,
    codigoCupom,
    valorCupom,
    validadeCupom,
    linkCompra
  });

  if (!para) {
    console.warn('[EMAIL] Cliente sem e-mail, envio ignorado');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <div style="text-align:center;margin-bottom:12px;">
        ${LOGO_IMG_HTML}
      </div>
      <h2>Olá, ${nome} 👋</h2>

      <p>Você recebeu um <strong>CUPOM DE DESCONTO de ${desconto}%</strong> para usar na Fox Uniformes!</p>

      <p><strong>Código do Cupom:</strong> <span style="background:#f4f4f4;padding:4px 8px;border-radius:4px;font-weight:bold;">${codigoCupom}</span></p>
      <p><strong>Valor mínimo para ativação:</strong> R$ ${valorCupom.toFixed(2)}</p>
      <p><strong>Válido até:</strong> ${validadeCupom}</p>

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
      subject: 'Fox Uniformes - Cupom de Desconto',
      html,
    });
    console.log(`📧 Cupom enviado para ${para}`);
  } catch (err) {
    console.error('❌ Erro ao enviar e-mail de cupom:', err);
  }
};

/**
 * Envia e-mail específico para recuperação de senha com link temporário
 */
const enviarRecuperacaoSenha = async ({ para, nome, linkReset, prazoHoras = 1 }) => {
  console.log('[EMAIL] Envio recuperação de senha:', { para, linkReset });

  if (!para) {
    console.warn('[EMAIL] Cliente sem e-mail, envio ignorado');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <div style="text-align:center;margin-bottom:12px;">
        ${LOGO_IMG_HTML}
      </div>
      <h2>Olá, ${nome || 'usuário'}.</h2>

      <p>Recebemos uma solicitação para redefinir a sua senha. Clique no botão abaixo para definir uma nova senha.</p>

      <p style="margin-top:8px;">
        <a href="${linkReset}"
           style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
          Redefinir minha senha
        </a>
      </p>

      <p style="font-size:13px;color:#666;margin-top:10px;">Este link expira em ${prazoHoras} hora(s). Se você não solicitou, ignore este e-mail.</p>

      <hr />
      <p style="font-size:12px;color:#777;">Fox Uniformes • Este é um e-mail automático</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: para,
      subject: 'Recuperação de senha - Fox Uniformes',
      html,
    });

    console.log(`📧 Email de recuperação enviado para ${para}`);
  } catch (err) {
    console.error('❌ Erro ao enviar e-mail de recuperação:', err);
    // Re-throw para que o controller capture e possamos retornar detalhes para debug
    throw err;
  }
};

export default {
  enviarLinkPagamento,
  enviarNotaFiscal,
  enviarCupom,
  enviarRecuperacaoSenha,
};
