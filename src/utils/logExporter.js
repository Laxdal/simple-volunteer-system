const fs = require('fs').promises;
const path = require('path');
const { Parser } = require('json2csv');
const logService = require('../services/logService');

class LogExporter {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
  }

  /**
   * 获取可用的日志日期范围
   * @param {string} type 日志类型
   * @returns {Promise<{earliest: Date|null, latest: Date|null}>}
   */
  async getAvailableLogRange(type = 'info') {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(file => file.startsWith(`${type}-`) && file.endsWith('.log'));
      
      if (logFiles.length === 0) {
        return { earliest: null, latest: null };
      }

      // 从文件名提取日期 (格式: type-YYYY-MM-DD.log)
      const dates = logFiles.map(file => {
        const dateStr = file.replace(`${type}-`, '').replace('.log', '');
        return new Date(dateStr);
      }).filter(date => !isNaN(date.getTime()));

      if (dates.length === 0) {
        return { earliest: null, latest: null };
      }

      return {
        earliest: new Date(Math.min(...dates)),
        latest: new Date(Math.max(...dates))
      };
    } catch (error) {
      console.error('Error getting available log range:', error);
      return { earliest: null, latest: null };
    }
  }

  /**
   * 获取指定日期范围的日志，并处理日期范围调整
   * @param {Date} requestedStartDate 请求的开始日期
   * @param {Date} requestedEndDate 请求的结束日期
   * @param {string} type 日志类型
   * @returns {Promise<{logs: Array, adjustedRange: {start: Date, end: Date}|null, message: string|null}>}
   */
  async getLogsByDateRange(requestedStartDate, requestedEndDate, type = 'info') {
    const logs = [];
    let adjustedRange = null;
    let message = null;

    // 获取可用的日志范围
    const { earliest, latest } = await this.getAvailableLogRange(type);
    
    if (!earliest || !latest) {
      return { 
        logs: [], 
        adjustedRange: null, 
        message: '没有找到可用的日志文件' 
      };
    }

    // 调整日期范围
    const actualStartDate = new Date(Math.max(earliest, requestedStartDate));
    const actualEndDate = new Date(Math.min(latest, requestedEndDate));
    actualEndDate.setHours(23, 59, 59, 999);

    // 如果请求的日期范围与实际可用范围不同，生成提示消息
    if (requestedStartDate < earliest || requestedEndDate > latest) {
      adjustedRange = { start: actualStartDate, end: actualEndDate };
      message = `可用日志范围为 ${earliest.toISOString().split('T')[0]} 至 ${
        latest.toISOString().split('T')[0]
      }，已自动调整导出范围。`;
    }

    // 读取日志文件
    const currentDate = new Date(actualStartDate);
    while (currentDate <= actualEndDate) {
      const filePath = logService.getLogFilePath(currentDate, type);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const entries = content.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line))
          .filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= actualStartDate && entryDate <= actualEndDate;
          });
        logs.push(...entries);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error reading log file ${filePath}:`, error);
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { logs, adjustedRange, message };
  }

  /**
   * 将日志导出为CSV格式
   * @param {Array} logs 日志条目数组
   * @returns {string} CSV格式的日志
   */
  toCSV(logs) {
    if (!logs.length) return '';

    // 展平嵌套的对象
    const flattenedLogs = logs.map(log => {
      const flattened = {};
      
      function flatten(obj, prefix = '') {
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            flatten(obj[key], `${prefix}${key}_`);
          } else {
            flattened[`${prefix}${key}`] = obj[key];
          }
        }
      }
      
      flatten(log);
      return flattened;
    });

    const parser = new Parser({
      fields: Object.keys(flattenedLogs[0])
    });

    return parser.parse(flattenedLogs);
  }

  /**
   * 将日志导出为JSON格式
   * @param {Array} logs 日志条目数组
   * @returns {string} JSON格式的日志
   */
  toJSON(logs) {
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 导出指定日期范围的日志
   * @param {Date} startDate 开始日期
   * @param {Date} endDate 结束日期
   * @param {string} type 日志类型
   * @param {string} format 导出格式 (csv|json)
   * @returns {Promise<string>} 导出的日志内容
   */
  async exportLogs(startDate, endDate, type = 'info', format = 'csv') {
    const logs = await this.getLogsByDateRange(startDate, endDate, type);
    
    if (format === 'csv') {
      return this.toCSV(logs);
    } else if (format === 'json') {
      return this.toJSON(logs);
    } else {
      throw new Error('Unsupported format');
    }
  }
}

module.exports = new LogExporter(); 