const express = require('express');
const router = express.Router();
const User = require('../models/user');
const UserStats = require('../models/userStats');
const Activity = require('../models/activity');
const Participation = require('../models/participation');
const auth = require('../middleware/auth');
const exportService = require('../utils/exportService');
const logExporter = require('../utils/logExporter');
const logService = require('../services/logService');
const { validateDateRange } = require('../middleware/validators');

// 管理员中间件
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
};

// 导出用户数据
router.get('/users/export', auth, isAdmin, async (req, res) => {
  try {
    const csv = await exportService.exportUsers();
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    
    // 添加BOM以支持Excel中文显示
    res.write('\ufeff');
    res.end(csv);
  } catch (error) {
    console.error('导出用户数据错误:', error);
    res.status(500).json({ message: '导出失败' });
  }
});

// 获取用户列表（包含统计信息）
router.get('/users', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }

    const { page = 1, limit = 20 } = req.query;
    
    const users = await User.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const total = await User.countDocuments();
    
    // 获取用户统计信息
    const userStats = await UserStats.find({
      user: { $in: users.map(u => u._id) }
    }).lean();
    
    // 将统计信息添加到用户数据中
    const usersWithStats = users.map(user => ({
      ...user,
      stats: userStats.find(stat => stat.user.toString() === user._id.toString()) || {
        totalHours: 0,
        participationCount: 0,
        rank: 0
      }
    }));

    res.json({
      users: usersWithStats,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个用户详情（包含统计信息）
router.get('/users/:userId', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }

    const user = await User.findById(req.params.userId).lean();
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 获取用户统计信息
    const stats = await UserStats.findOne({ user: user._id }).lean();
    
    res.json({
      ...user,
      stats,
      age: user.birthday ? calculateAge(user.birthday) : null
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 计算年龄的辅助函数
function calculateAge(birthday) {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// 更新用户角色
router.patch('/users/:userId/role', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    // 验证角色值
    if (!['admin', 'volunteer'].includes(role)) {
      return res.status(400).json({ message: '无效的角色值' });
    }

    // 防止管理员修改自己的角色
    if (userId === req.user.userId) {
      return res.status(400).json({ message: '不能修改自己的角色' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户信息
router.put('/users/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      email,
      name,
      gender,
      birthday,
      phone,
      role,
      status
    } = req.body;

    // 验证必需字段
    if (!email || !name || !gender || !birthday || !role || !status) {
      return res.status(400).json({ message: '缺少必需字段' });
    }

    // 验证角色值
    if (!['admin', 'volunteer'].includes(role)) {
      return res.status(400).json({ message: '无效的角色值' });
    }

    // 验证状态值
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }

    // 防止管理员修改自己的角色
    if (userId === req.user.userId && role !== 'admin') {
      return res.status(400).json({ message: '不能降低自己的权限' });
    }

    // 检查邮箱是否已被其他用户使用
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ message: '邮箱已被其他用户使用' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        email,
        name,
        gender,
        birthday: new Date(birthday),
        phone,
        role,
        status,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('更新用户信息错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: '数据验证错误',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// 导出活动数据
router.get('/activities/export', auth, isAdmin, async (req, res) => {
  try {
    const csv = await exportService.exportActivities();
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=activities.csv');
    
    // 添加BOM以支持Excel中文显示
    res.write('\ufeff');
    res.end(csv);
  } catch (error) {
    console.error('导出活动数据错误:', error);
    res.status(500).json({ message: '导出失败' });
  }
});

/**
 * @route GET /api/admin/logs/export
 * @desc Export system logs by date range and type
 * @access Admin only
 */
router.get('/logs/export', 
  auth, 
  isAdmin,
  validateDateRange,
  async (req, res) => {
    try {
      const { startDate, endDate, type = 'info', format = 'csv' } = req.query;
      
      const result = await logExporter.getLogsByDateRange(
        new Date(startDate), 
        new Date(endDate), 
        type
      );
      
      if (result.logs.length === 0) {
        return res.status(404).json({ 
          message: result.message || '指定时间范围内没有找到日志'
        });
      }

      // 如果日期范围被调整，在响应头中添加提示信息
      if (result.adjustedRange) {
        res.setHeader('X-Date-Range-Adjusted', 'true');
        res.setHeader('X-Available-Date-Range', result.message);
      }

      const filename = `logs-${type}-${
        result.adjustedRange ? 
          result.adjustedRange.start.toISOString().split('T')[0] : 
          startDate
      }-to-${
        result.adjustedRange ? 
          result.adjustedRange.end.toISOString().split('T')[0] : 
          endDate
      }.${format}`;
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        return res.json({
          logs: result.logs,
          message: result.message,
          adjustedRange: result.adjustedRange
        });
      }
      
      const csvData = await logExporter.toCSV(result.logs);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // 如果有日期调整信息，添加到CSV文件开头
      if (result.message) {
        res.write(`# ${result.message}\n\n`);
      }
      
      res.write('\ufeff'); // 添加BOM以支持Excel中文显示
      return res.send(csvData);
      
    } catch (error) {
      console.error('Error exporting logs:', error);
      res.status(500).json({ message: '导出日志时发生错误' });
    }
});

module.exports = router; 