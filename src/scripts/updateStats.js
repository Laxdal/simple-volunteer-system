const mongoose = require('mongoose');
const UserStats = require('../models/userStats');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://{UserName}:{Password}@localhost:27017/volunteer?authSource=admin';

async function updateAllStats() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB 连接成功');

        // 更新所有过期的统计信息
        const updatedCount = await UserStats.updateExpiredStats();
        console.log(`已更新 ${updatedCount} 条统计信息`);

        // 更新所有排名
        await UserStats.updateAllRanks();
        console.log('排名更新完成');

        // 输出前10名用户
        const topUsers = await UserStats.find()
            .populate('user', 'username')
            .sort({ totalHours: -1 })
            .limit(10);
            
        console.log('\n排行榜前10名:');
        topUsers.forEach((stat, index) => {
            console.log(`第${index + 1}名: ${stat.user.username} - ${stat.totalHours.toFixed(1)}小时`);
        });

    } catch (error) {
        console.error('更新统计信息时出错:', error);
    } finally {
        await mongoose.disconnect();
        console.log('数据库连接已关闭');
    }
}

// 运行更新
updateAllStats(); 