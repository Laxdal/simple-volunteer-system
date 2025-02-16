FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装生产环境依赖
RUN npm install json2csv winston winston-daily-rotate-file && npm install

# 复制源代码
COPY . .

# 创建日志目录
RUN mkdir -p /app/logs

# 添加数据卷
VOLUME ["/app/logs"]

# 添加 node_modules 卷
VOLUME ["/app/node_modules"]

# 添加 wget 用于健康检查
RUN apk add --no-cache wget

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# 确保端口正确暴露
EXPOSE 3000

CMD ["npm", "start"] 