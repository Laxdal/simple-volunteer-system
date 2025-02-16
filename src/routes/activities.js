const express = require('express');
const router = express.Router();
const Activity = require('../models/activity');
const User = require('../models/user');
const auth = require('../middleware/auth');

// 管理员中间件
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }
    next();
  } catch (error) {
    console.error('管理员权限检查错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取活动列表
router.get('/', async (req, res) => {
  try {
    const { 
      status = 'published', 
      timeStatus, 
      page = 1, 
      limit = 10,
      latitude,
      longitude,
      distance,
      location
    } = req.query;

    let query = {};
    // 只有当status不是'all'时才添加状态过滤
    if (status !== 'all') {
      query.status = status;
    }

    // 处理不同的查询场景
    let activities;
    const queryOptions = {
      virtuals: true,
      getters: true
    };

    if (latitude && longitude) {
      // 附近的活动查询
      activities = await Activity.findNearbyActivities(
        parseFloat(latitude),
        parseFloat(longitude),
        parseInt(distance) || 5000,
        query
      );
    } else if (location) {
      // 特定地点的活动查询
      query['location.name'] = location;
      activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(queryOptions);
    } else {
      // 普通活动查询
      activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(queryOptions);
    }

    // 在返回结果前添加 isRegisterable 字段
    activities = activities.map(activity => {
      const now = new Date();
      return {
        ...activity,
        isRegisterable: 
          activity.status === 'published' && 
          now < new Date(activity.startTime) && 
          activity.currentParticipants < activity.maxParticipants
      };
    });

    // 获取总数
    const total = await Activity.countDocuments(query);

    // 在内存中处理时间状态过滤
    if (timeStatus) {
      activities = activities.filter(activity => activity.timeStatus === timeStatus);
    }

    res.json({
      activities,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('获取活动列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个活动详情
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .select('name description location contactPerson status maxParticipants currentParticipants startTime endTime createdBy')
      .populate('createdBy', 'username name')
      .lean();
    
    if (!activity) {
      return res.status(404).json({ message: '活动不存在' });
    }
    
    res.json(activity);
  } catch (error) {
    console.error('获取活动详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建新活动（需要管理员权限）
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      contactPerson,
      maxParticipants,
      startTime,
      endTime
    } = req.body;

    // 创建基本活动对象
    const activityData = {
      name,
      description,
      location: {
        name: location.name
      },
      contactPerson,
      maxParticipants,
      startTime,
      endTime,
      createdBy: req.user.userId,
      status: 'draft'
    };

    // 如果提供了有效的坐标，添加到location中
    if (location.coordinates && 
        Array.isArray(location.coordinates.coordinates) && 
        location.coordinates.coordinates.length === 2) {
      activityData.location.coordinates = {
        type: 'Point',
        coordinates: location.coordinates.coordinates
      };
    }

    const activity = new Activity(activityData);
    await activity.save();
    res.status(201).json(activity);
  } catch (error) {
    console.error('创建活动错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: '数据验证错误',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      message: '服务器错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 更新活动（需要管理员权限）
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!activity) {
      return res.status(404).json({ message: '活动不存在' });
    }

    res.json(activity);
  } catch (error) {
    console.error('更新活动错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: '数据验证错误',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新活动状态（需要管理员权限）
router.patch('/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!activity) {
      return res.status(404).json({ message: '活动不存在' });
    }

    res.json(activity);
  } catch (error) {
    console.error('更新活动状态错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: '数据验证错误',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除活动（需要管理员权限）
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ message: '活动不存在' });
    }
    
    res.json({ message: '活动已删除' });
  } catch (error) {
    console.error('删除活动错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 