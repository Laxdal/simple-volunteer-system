const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 检查必要的环境变量
if (!process.env.JWT_SECRET) {
  console.error('错误: 未设置 JWT_SECRET 环境变量');
  process.exit(1);
}

// 导入路由
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const activityRoutes = require('./routes/activities');
const participationRoutes = require('./routes/participations');
const rankingsRoutes = require('./routes/rankings');

const app = express();

// 配置信任代理
app.set('trust proxy', 1);

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP限制100个请求
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// 日志中间件
app.use(morgan('dev'));

// CORS配置
app.use(cors({
  origin: true, // 允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 预检请求缓存24小时
}));

// 请求解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static('public'));

// MongoDB 连接
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:yhos2025@192.168.1.101:27017/volunteer?authSource=admin';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => {
    console.error('MongoDB 连接失败:', err);
    process.exit(1);
  });

// 请求日志
app.use((req, res, next) => {
  console.log('收到请求:', req.method, req.url);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('请求体:', req.body);
  }
  next();
});

// OPTIONS 请求处理
app.options('*', cors());

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/participations', participationRoutes);
app.use('/api/rankings', rankingsRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ message: '未找到请求的资源' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`服务器运行在: http://localhost:${port}`);
});

module.exports = app; 