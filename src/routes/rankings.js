const express = require('express');
const router = express.Router();
const UserStats = require('../models/userStats');
const User = require('../models/user');
const Activity = require('../models/activity');
const Participation = require('../models/participation');
const auth = require('../middleware/auth');

// 获取排行榜
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const currentUserId = req.user.userId;
    
    // 使用优化后的方法获取排行榜数据
    const rankings = await UserStats.getRankings(parseInt(page), parseInt(limit));
    
    // 获取总数
    const total = await UserStats.countDocuments();
    
    // 获取当前用户的统计信息
    const currentUserStats = await UserStats.findOne({ user: currentUserId })
      .populate('user', 'username')
      .lean();

    // 整合数据
    const rankingsData = rankings.map(rank => ({
      rank: rank.rank,
      userId: rank.user._id,
      username: rank.user.username,
      totalHours: rank.totalHours
    }));

    res.json({
      rankings: rankingsData,
      currentUser: {
        rank: currentUserStats?.rank || '-',
        userId: currentUserStats?.user._id || null,
        totalHours: currentUserStats?.totalHours || 0,
        username: currentUserStats?.user.username || null
      },
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('获取排行榜错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户详细信息
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const userStats = await UserStats.findOne({ user: req.params.userId })
      .populate('user', 'username birthday')
      .lean();

    if (!userStats) {
      return res.status(404).json({ message: '未找到用户统计信息' });
    }

    res.json({
      username: userStats.user.username,
      age: userStats.user.birthday ? calculateAge(userStats.user.birthday) : null,
      totalHours: userStats.totalHours,
      participationCount: userStats.participationCount,
      rank: userStats.rank,
      lastActivityName: userStats.lastActivityName,
      lastActivityDate: userStats.lastActivityDate
    });
  } catch (error) {
    console.error('获取用户统计信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 手动触发排名更新（管理员功能）
router.post('/update', auth, async (req, res) => {
  try {
    const updatedCount = await UserStats.updateExpiredStats();
    res.json({ 
      message: '排名更新成功',
      updatedCount
    });
  } catch (error) {
    console.error('更新排名错误:', error);
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

module.exports = router; 