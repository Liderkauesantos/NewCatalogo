FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package.json ./
RUN npm install --production

# Copiar código fonte
COPY server.js ./

# Expor porta
EXPOSE 3001

# Comando de inicialização
CMD ["node", "server.js"]
