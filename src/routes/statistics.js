const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const auth = require('../middleware/auth');

// 获取个人时数统计
router.get('/personal', auth, async (req, res) => {
  try {
    const stats = await Record.aggregate([
      { $match: { 
        user: req.user.userId,
        status: 'approved'
      }},
      { $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        averageHours: { $avg: '$hours' },
        recordCount: { $sum: 1 }
      }}
    ]);

    // 按月统计
    const monthlyStats = await Record.aggregate([
      { $match: { 
        user: req.user.userId,
        status: 'approved'
      }},
      { $group: {
        _id: { 
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        totalHours: { $sum: '$hours' },
        recordCount: { $sum: 1 }
      }},
      { $sort: { '_id.year': -1, '_id.month': -1 }}
    ]);

    res.json({
      overall: stats[0] || { totalHours: 0, averageHours: 0, recordCount: 0 },
      monthly: monthlyStats
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 管理员获取全局统计
router.get('/global', auth, async (req, res) => {
  try {
    const globalStats = await Record.aggregate([
      { $match: { status: 'approved' }},
      { $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        averageHours: { $avg: '$hours' },
        volunteerCount: { $addToSet: '$user' },
        recordCount: { $sum: 1 }
      }},
      { $project: {
        totalHours: 1,
        averageHours: 1,
        volunteerCount: { $size: '$volunteerCount' },
        recordCount: 1
      }}
    ]);

    res.json(globalStats[0] || {
      totalHours: 0,
      averageHours: 0,
      volunteerCount: 0,
      recordCount: 0
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 