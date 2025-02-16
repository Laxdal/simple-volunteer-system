const express = require('express');
const router = express.Router();
const Participation = require('../models/participation');
const Activity = require('../models/activity');
const auth = require('../middleware/auth');

// 获取用户的所有参与记录
router.get('/my', auth, async (req, res) => {
  try {
    const participations = await Participation.find({ user: req.user.userId })
      .populate({
        path: 'activity',
        select: 'name description startTime endTime location status'
      })
      .sort('-registrationTime')
      .lean();

    if (!participations) {
      return res.json([]);
    }

    res.json(participations);
  } catch (error) {
    console.error('获取参与记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 报名活动
router.post('/:activityId/register', auth, async (req, res) => {
  try {
    // 检查活动是否存在且可以报名
    const activity = await Activity.findById(req.params.activityId);
    if (!activity) {
      return res.status(404).json({ message: '活动不存在' });
    }

    if (activity.status !== 'published') {
      return res.status(400).json({ message: '活动未发布，无法报名' });
    }

    if (!activity.isRegisterable) {
      return res.status(400).json({ message: '活动已结束或人数已满' });
    }

    // 检查是否已经报名
    const existingParticipation = await Participation.findOne({
      user: req.user.userId,
      activity: req.params.activityId
    });

    if (existingParticipation) {
      return res.status(400).json({ message: '已经报名过这个活动' });
    }

    // 创建新的参与记录
    const participation = new Participation({
      user: req.user.userId,
      activity: req.params.activityId
    });

    await participation.save();

    // 更新活动的当前参与人数
    await Activity.findByIdAndUpdate(req.params.activityId, {
      $inc: { currentParticipants: 1 }
    });

    res.status(201).json(participation);
  } catch (error) {
    console.error('活动报名错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 取消报名
router.post('/:activityId/cancel', auth, async (req, res) => {
  try {
    const participation = await Participation.findOne({
      user: req.user.userId,
      activity: req.params.activityId
    });

    if (!participation) {
      return res.status(404).json({ message: '未找到报名记录' });
    }

    if (participation.status !== 'registered') {
      return res.status(400).json({ message: '无法取消当前状态的报名' });
    }

    participation.status = 'cancelled';
    await participation.save();

    // 更新活动的当前参与人数
    await Activity.findByIdAndUpdate(req.params.activityId, {
      $inc: { currentParticipants: -1 }
    });

    res.json(participation);
  } catch (error) {
    console.error('取消报名错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 签到
router.post('/:activityId/check-in', auth, async (req, res) => {
  try {
    const { latitude, longitude, device } = req.body;

    // 获取活动和参与记录
    const activity = await Activity.findById(req.params.activityId);
    if (!activity) {
      return res.status(404).json({ message: '活动不存在' });
    }

    const participation = await Participation.findOne({
      user: req.user.userId,
      activity: req.params.activityId
    });

    if (!participation) {
      return res.status(404).json({ message: '未找到报名记录' });
    }

    if (participation.status !== 'registered') {
      return res.status(400).json({ message: '当前状态无法签到' });
    }

    // 检查是否在允许的签到时间范围内
    if (!activity.isCheckInEnabled) {
      return res.status(400).json({ 
        message: '不在签到时间范围内（活动开始前3小时至活动结束）' 
      });
    }

    // 如果提供了位置信息，验证位置
    if (latitude && longitude) {
      if (!activity.isLocationValid(latitude, longitude)) {
        return res.status(400).json({ 
          message: '不在活动允许的签到范围内',
          details: {
            activityLocation: {
              latitude: activity.location.latitude,
              longitude: activity.location.longitude,
              range: activity.location.range
            },
            userLocation: { latitude, longitude }
          }
        });
      }
    } else if (activity.location.requireLocation) {
      return res.status(400).json({ message: '此活动需要位置信息才能签到' });
    }

    // 记录签到信息
    participation.checkIn = {
      time: new Date(),
      device
    };

    if (latitude && longitude) {
      participation.checkIn.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }

    await participation.save();
    res.json(participation);
  } catch (error) {
    console.error('签到错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 签退
router.post('/:activityId/check-out', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const participation = await Participation.findOne({
      user: req.user.userId,
      activity: req.params.activityId
    });

    if (!participation) {
      return res.status(404).json({ message: '未找到报名记录' });
    }

    if (!participation.checkIn?.time) {
      return res.status(400).json({ message: '请先签到' });
    }

    participation.checkOut = {
      time: new Date()
    };

    if (latitude && longitude) {
      participation.checkOut.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }

    participation.status = 'completed';
    await participation.save();

    // 更新用户的总参与时长
    const User = require('../models/user');
    const user = await User.findById(req.user.userId);
    await user.updateTotalParticipationHours();

    res.json({
      participation,
      totalHours: user.totalParticipationHours
    });
  } catch (error) {
    console.error('签退错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 管理员获取活动的所有参与记录
router.get('/activity/:activityId', auth, async (req, res) => {
  try {
    const participations = await Participation.find({
      activity: req.params.activityId
    })
      .populate('user', 'username name')
      .sort('-registrationTime');
    res.json(participations);
  } catch (error) {
    console.error('获取活动参与记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 