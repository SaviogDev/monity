# 💰 Monity — API de Controle Financeiro

Backend RESTful para a aplicação **Monity**, construído com Node.js, Express e MongoDB.

---

## 🗂 Estrutura do Projeto

```
monity/
├── src/
│   ├── config/
│   │   ├── database.js       # Conexão com o MongoDB
│   │   └── env.js            # Validação de variáveis de ambiente
│   ├── controllers/
│   │   └── healthController.js
│   ├── middlewares/
│   │   ├── errorHandler.js   # Tratamento centralizado de erros
│   │   └── notFound.js       # Handler 404
│   ├── models/               # Models Mongoose (a criar)
│   ├── routes/
│   │   ├── index.js          # Registro central de rotas
│   │   └── healthRoutes.js
│   ├── services/             # Regras de negócio (a criar)
│   ├── app.js                # Configuração do Express
│   └── server.js             # Entry point
├── .env.example
├── .gitignore
└── package.json
```

---

## ⚙️ Pré-requisitos

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) local ou instância na nuvem (ex: MongoDB Atlas)

---

## 🚀 Como rodar

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/monity.git
cd monity
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/monity
```

### 4. Inicie o servidor

**Desenvolvimento** (com hot-reload via nodemon):

```bash
npm run dev
```

**Produção:**

```bash
npm start
```

---

## 🔍 Verificação

Acesse no navegador ou via curl:

```
GET http://localhost:3000/api/health
```

Resposta esperada:

```json
{
  "success": true,
  "message": "Monity API está no ar 🚀",
  "environment": "development",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "status": "connected"
  }
}
```

---

## 🛣️ Próximos passos

- [ ] Model e rotas de `User` (autenticação JWT)
- [ ] Model e rotas de `Transaction` (receitas e despesas)
- [ ] Model e rotas de `Category`
- [ ] Middleware de autenticação (`authMiddleware.js`)
- [ ] Validação de dados com `zod` ou `joi`
- [ ] Paginação e filtros nas listagens