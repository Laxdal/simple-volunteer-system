const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

class LogService {
  constructor() {
    // 确保日志目录存在
    const logDir = path.join(process.cwd(), 'logs');
    
    // 定义日志格式
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    this.logger = winston.createLogger({
      format: logFormat,
      transports: [
        // 普通信息日志
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'info-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat
        }),
        // 错误日志
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat
        }),
        // 导出操作专用日志
        new winston.transports.DailyRotateFile({
          filename: path.join(logDir, 'export-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat
        })
      ]
    });

    // 非生产环境下添加控制台输出
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  // 记录用户活动
  logUserActivity(userId, action, details) {
    this.logger.info('User Activity', {
      userId,
      action,
      details,
      timestamp: new Date(),
      ip: details.ip,
      userAgent: details.userAgent,
      method: details.method,
      path: details.path,
      query: details.query,
      body: details.body
    });
  }

  // 记录导出活动
  logExportActivity(userId, action, details) {
    this.logger.info('Export Activity', {
      userId,
      action,
      details,
      timestamp: new Date(),
      ip: details.ip,
      userAgent: details.userAgent,
      exportType: details.exportType,
      filters: details.filters,
      recordCount: details.recordCount
    });
  }

  // 记录错误
  logError(userId, error, context) {
    this.logger.error('Error', {
      userId,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      ip: context.ip,
      userAgent: context.userAgent,
      path: context.path,
      method: context.method
    });
  }

  // 记录系统事件
  logSystemEvent(event, details) {
    this.logger.info('System Event', {
      event,
      details,
      timestamp: new Date(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version
    });
  }

  // 记录安全事件
  logSecurityEvent(userId, event, details) {
    this.logger.warn('Security Event', {
      userId,
      event,
      details,
      timestamp: new Date(),
      ip: details.ip,
      userAgent: details.userAgent,
      path: details.path
    });
  }

  // 记录性能指标
  logPerformance(operation, duration, details) {
    this.logger.info('Performance', {
      operation,
      duration,
      details,
      timestamp: new Date(),
      memory: process.memoryUsage()
    });
  }

  // 获取指定日期的日志文件路径
  getLogFilePath(date, type = 'info') {
    const dateStr = date.toISOString().split('T')[0];
    return path.join(process.cwd(), 'logs', `${type}-${dateStr}.log`);
  }
}

// 创建单例实例
const logService = new LogService();

module.exports = logService; 