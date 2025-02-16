const { Parser } = require('json2csv');
const User = require('../models/user');
const UserStats = require('../models/userStats');
const Activity = require('../models/activity');
const Participation = require('../models/participation');

// 导出用户数据
async function exportUsers() {
  try {
    // 获取所有用户数据
    const users = await User.find().lean();
    
    // 获取用户统计信息
    const userStats = await UserStats.find().lean();
    
    // 合并用户数据和统计信息
    const usersWithStats = users.map(user => {
      const stats = userStats.find(stat => stat.user.toString() === user._id.toString()) || {
        totalHours: 0,
        participationCount: 0,
        rank: 0
      };
      
      return {
        用户名: user.username,
        姓名: user.name,
        邮箱: user.email,
        性别: user.gender,
        出生日期: user.birthday ? new Date(user.birthday).toLocaleDateString() : '',
        电话: user.phone || '',
        角色: user.role,
        状态: user.status,
        总参与时长: stats.totalHours.toFixed(1),
        参与活动次数: stats.participationCount,
        当前排名: stats.rank,
        最近活动日期: stats.lastActivityDate ? new Date(stats.lastActivityDate).toLocaleDateString() : '',
        注册时间: new Date(user.createdAt).toLocaleDateString()
      };
    });

    // 添加统计信息
    usersWithStats.push({});  // 空行
    usersWithStats.push({
      用户名: `总用户数：${users.length}`,
      姓名: `管理员数：${users.filter(u => u.role === 'admin').length}`,
      邮箱: `志愿者数：${users.filter(u => u.role === 'volunteer').length}`
    });

    // 转换为CSV
    const fields = Object.keys(usersWithStats[0]);
    const parser = new Parser({ fields });
    return parser.parse(usersWithStats);
  } catch (error) {
    console.error('导出用户数据错误:', error);
    throw error;
  }
}

// 导出活动数据
async function exportActivities() {
  try {
    // 获取所有活动
    const activities = await Activity.find()
      .sort({ startTime: -1 })
      .lean();

    // 获取所有参与记录
    const participations = await Participation.find()
      .populate('user', 'username name')
      .lean();

    // 处理每个活动的数据
    const exportData = [];
    
    for (const activity of activities) {
      // 添加活动基本信息
      exportData.push({
        类型: '活动信息',
        活动名称: activity.name,
        活动描述: activity.description,
        活动地点: activity.location.name,
        开始时间: new Date(activity.startTime).toLocaleString(),
        结束时间: new Date(activity.endTime).toLocaleString(),
        状态: activity.status,
        最大参与人数: activity.maxParticipants,
        当前参与人数: activity.currentParticipants
      });

      // 添加空行
      exportData.push({});

      // 获取该活动的所有参与记录
      const activityParticipations = participations.filter(p => 
        p.activity.toString() === activity._id.toString()
      );

      // 添加参与者信息
      activityParticipations.forEach(participation => {
        exportData.push({
          类型: '参与记录',
          用户名: participation.user.username,
          姓名: participation.user.name,
          状态: participation.status,
          签到时间: participation.checkIn?.time ? new Date(participation.checkIn.time).toLocaleString() : '',
          签退时间: participation.checkOut?.time ? new Date(participation.checkOut.time).toLocaleString() : '',
          参与时长: participation.participationHours || 0
        });
      });

      // 添加活动统计信息
      exportData.push({});
      exportData.push({
        类型: '统计信息',
        活动名称: `报名人数：${activityParticipations.length}`,
        活动描述: `实际参与人数：${activityParticipations.filter(p => p.status === 'completed').length}`,
        活动地点: `总时长：${activityParticipations.reduce((sum, p) => sum + (p.participationHours || 0), 0)}小时`
      });
      exportData.push({});  // 添加空行分隔不同活动
    }

    // 添加总体统计信息
    exportData.push({
      类型: '总体统计',
      活动名称: `总活动数：${activities.length}`,
      活动描述: `已完成活动：${activities.filter(a => a.status === 'completed').length}`,
      活动地点: `进行中活动：${activities.filter(a => a.status === 'published').length}`
    });

    // 转换为CSV
    const fields = [
      '类型', '活动名称', '活动描述', '活动地点', '开始时间', '结束时间', '状态', 
      '最大参与人数', '当前参与人数', '用户名', '姓名', '签到时间', '签退时间', '参与时长'
    ];
    const parser = new Parser({ fields });
    return parser.parse(exportData);
  } catch (error) {
    console.error('导出活动数据错误:', error);
    throw error;
  }
}

module.exports = {
  exportUsers,
  exportActivities
}; 