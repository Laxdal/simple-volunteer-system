const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middleware/auth');

// 登录路由
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码都是必需的' });
    }

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 返回用户信息和token
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      expiresIn: 7200
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 注册路由
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      name,
      gender,
      birthday,
      phone,
      address,
      languages
    } = req.body;
    
    // 验证必需字段
    if (!username || !email || !password || !name || !gender || !birthday) {
      return res.status(400).json({ 
        message: '缺少必需字段',
        required: ['username', 'email', 'password', 'name', 'gender', 'birthday']
      });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: '邮箱已被注册' });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      name,
      gender,
      birthday: new Date(birthday),
      phone,
      address: {
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        zipCode: address?.zipCode || ''
      },
      languages: Array.isArray(languages) ? languages : [],
      role: 'volunteer', // 默认角色
      status: 'active'   // 默认状态
    });

    await user.save();

    // 生成 JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        gender: user.gender,
        birthday: user.birthday,
        phone: user.phone,
        address: user.address,
        languages: user.languages,
        status: user.status
      },
      expiresIn: 7200
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ 
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 修改密码
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // 验证输入
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '当前密码和新密码都是必需的' });
    }

    // 获取用户
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 