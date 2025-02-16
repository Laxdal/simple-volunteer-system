const config = {
  // 数据库配置
  db: {
    uri: process.env.MONGO_URI,
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  },
  
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: '/app/logs'
  },
  
  // CORS配置
  cors: {
    origin: '*', // 在生产环境中应该设置具体的域名
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};

module.exports = config; 