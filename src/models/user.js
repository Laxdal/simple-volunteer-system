const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  birthday: {
    type: Date,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'volunteer'],
    default: 'volunteer',
    index: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  phone: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  languages: [{
    type: String,
    enum: ['Chinese', 'English', 'Other'],
    trim: true
  }],
  certificates: [{
    name: String,
    issueDate: Date,
    expiryDate: Date,
    issuingAuthority: String
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  totalParticipationHours: {
    type: Number,
    default: 0,
    min: 0
  },
  lastParticipationUpdate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 更新用户的总参与时长
userSchema.methods.updateTotalParticipationHours = async function() {
  const Participation = require('./participation');
  
  const participations = await Participation.find({
    user: this._id,
    status: 'completed'
  });

  this.totalParticipationHours = participations.reduce(
    (total, participation) => total + (participation.participationHours || 0),
    0
  );
  
  this.lastParticipationUpdate = new Date();
  await this.save();
  
  return this.totalParticipationHours;
};

module.exports = mongoose.model('User', userSchema); 