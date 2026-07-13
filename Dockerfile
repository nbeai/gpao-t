FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV GPAO_T_STATE_DIR=/data/gpao-t
ENV GPAO_T_STATE_HOME=/data/gpao-t
ENV GPAO_T_HOST=0.0.0.0
ENV GPAO_T_PORT=18799

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

RUN node --check bin/gpao-t.js

VOLUME ["/data/gpao-t"]
EXPOSE 18799

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('node:http');const req=http.get('http://127.0.0.1:18799/health',res=>process.exit(res.statusCode>=200&&res.statusCode<500?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"

CMD ["node", "bin/gpao-t.js", "control", "serve", "18799"]
