/**
 * 验证日期范围参数
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate, type, format } = req.query;

  // 验证必需的日期参数
  if (!startDate || !endDate) {
    return res.status(400).json({ message: '开始日期和结束日期是必需的' });
  }

  // 验证日期格式 (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ message: '日期格式无效，请使用YYYY-MM-DD格式' });
  }

  // 验证日期范围
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: '无效的日期' });
  }

  if (end < start) {
    return res.status(400).json({ message: '结束日期不能早于开始日期' });
  }

  const maxRange = 31; // 最大导出范围为31天
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > maxRange) {
    return res.status(400).json({ message: `日期范围不能超过${maxRange}天` });
  }

  // 验证日志类型
  if (type && !['info', 'error', 'export'].includes(type)) {
    return res.status(400).json({ message: '无效的日志类型' });
  }

  // 验证导出格式
  if (format && !['csv', 'json'].includes(format)) {
    return res.status(400).json({ message: '无效的导出格式' });
  }

  next();
};

module.exports = {
  validateDateRange
}; 