const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  participation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participation',
    required: true
  },
  type: {
    type: String,
    enum: ['checkIn', 'checkOut'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  deviceInfo: {
    deviceId: String,
    deviceType: String,
    browser: String,
    os: String,
    ip: String
  },
  status: {
    type: String,
    enum: ['valid', 'invalid', 'manual'],
    default: 'valid'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建索引
checkInSchema.index({ user: 1, activity: 1 });
checkInSchema.index({ participation: 1 });
checkInSchema.index({ timestamp: 1 });
checkInSchema.index({ location: '2dsphere' });
checkInSchema.index({ type: 1, status: 1 });

// 验证签到位置是否在活动范围内的方法
checkInSchema.methods.validateLocation = async function(activityLocation, radius) {
  if (!activityLocation || !activityLocation.coordinates) {
    return false;
  }

  const earthRadius = 6371000; // 地球半径（米）
  const [activityLng, activityLat] = activityLocation.coordinates;
  const [checkInLng, checkInLat] = this.location.coordinates;

  // 使用 Haversine 公式计算距离
  const dLat = (checkInLat - activityLat) * Math.PI / 180;
  const dLng = (checkInLng - activityLng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(activityLat * Math.PI / 180) * Math.cos(checkInLat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = earthRadius * c;

  return distance <= radius;
};

module.exports = mongoose.model('CheckIn', checkInSchema); 