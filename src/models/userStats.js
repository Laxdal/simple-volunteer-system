const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  participationCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActivityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  lastActivityDate: {
    type: Date,
    index: true
  },
  lastActivityName: String,
  rank: {
    type: Number,
    default: 0,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  nextUpdateDue: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// 创建复合索引
userStatsSchema.index({ totalHours: -1, 'user.joinDate': 1 });

// 更新单个用户统计信息
userStatsSchema.statics.updateUserStats = async function(userId) {
  const Participation = require('./participation');
  const Activity = require('./activity');
  
  // 获取用户的所有完成的参与记录
  const participations = await Participation.find({
    user: userId,
    status: 'completed'
  }).sort({ 'checkOut.time': -1 });

  // 计算总时长
  const totalHours = participations.reduce(
    (total, p) => total + (p.participationHours || 0),
    0
  );

  // 获取最近的活动信息
  let lastActivityData = {};
  if (participations.length > 0) {
    const lastActivity = await Activity.findById(participations[0].activity);
    if (lastActivity) {
      lastActivityData = {
        lastActivityId: lastActivity._id,
        lastActivityDate: participations[0].checkOut.time,
        lastActivityName: lastActivity.name
      };
    }
  }

  // 设置下次更新时间（1小时后）
  const nextUpdateDue = new Date(Date.now() + 60 * 60 * 1000);

  // 更新统计信息
  const stats = await this.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        totalHours,
        participationCount: participations.length,
        ...lastActivityData,
        nextUpdateDue,
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  return stats;
};

// 批量更新排名
userStatsSchema.statics.updateAllRanks = async function() {
  const stats = await this.find()
    .populate('user', 'joinDate')
    .sort({ totalHours: -1, 'user.joinDate': 1 })
    .lean();
  
  // 批量更新排名
  const bulkOps = stats.map((stat, index) => ({
    updateOne: {
      filter: { _id: stat._id },
      update: { $set: { rank: index + 1 } }
    }
  }));

  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
};

// 检查并更新过期的统计信息
userStatsSchema.statics.updateExpiredStats = async function() {
  const now = new Date();
  const expiredStats = await this.find({
    nextUpdateDue: { $lte: now }
  }).select('user');

  for (const stat of expiredStats) {
    await this.updateUserStats(stat.user);
  }

  // 如果有更新，重新计算排名
  if (expiredStats.length > 0) {
    await this.updateAllRanks();
  }

  return expiredStats.length;
};

// 获取排行榜数据（带缓存）
userStatsSchema.statics.getRankings = async function(page = 1, limit = 10) {
  // 检查并更新过期的统计信息
  await this.updateExpiredStats();

  // 获取分页的排行榜数据
  return this.find()
    .populate('user', 'username joinDate')
    .sort({ rank: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('UserStats', userStatsSchema); 