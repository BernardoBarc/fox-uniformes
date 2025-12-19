# Fox Uniformes - Sistema de Gestão de Vendas

Projeto iniciado com intuito de criar um aplicativo com finalidade de:
  *Realizar encomendas de uniformes
  *Vendedores contratados realizar "praça" (rotas de visitas para gerar venda)
  *Pedidos com opção de personalização

## 🚀 Deploy

### Frontend (Vercel)
1. Conecte o repositório ao Vercel
2. Configure a variável de ambiente:
   ```
   NEXT_PUBLIC_API_URL=https://sua-api.railway.app
   ```

### Backend (Railway)
1. Conecte o repositório ao Railway
2. Configure as variáveis de ambiente:
   ```
   PORT=5000
   MONGODB_URI=sua_string_mongodb
   JWT_SECRET=sua_chave_secreta
   FRONTEND_URL=https://seu-app.vercel.app
   ```

## ⚙️ Configuração Local

### Frontend
```bash
cd fox-uniformes
npm install
npm run dev
```

### Backend
```bash
cd fox-uniformes/Backend
npm install
node index.js
```

## 📋 Funcionalidades

Aplicativo conta com funcionalidades como:
  *Login de usuario (admin e vendedores)
  *Realizar pagamento para gerar encomenda
  *Atualização de status do pedido realizado
  *Envio de notificação referente ao pedido para o cliente
  *Sistema de cupons de desconto
  *Acompanhamento de pedidos pelo cliente
  *Geração de notas fiscais

Aplicativo com ideia incial apenas para aparelhos celulares
Responsividade e atratividade
Design atrativo com cores baseadas na paleta de cores da empresa
Design responsivo com transições suaves sem exagero
Formulário de contato vinculado ao email empresarial
Formulário de recuperação de conta com autenticação de segurança
