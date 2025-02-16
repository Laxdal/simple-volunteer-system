const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    name: {
      type: String,
      required: true
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      required: false
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      required: false
    },
    range: {
      type: Number,
      min: 0,
      required: false,
      description: 'Range in meters'
    },
    requireLocation: {
      type: Boolean,
      default: false,
      description: 'Whether location validation is required for check-in'
    }
  },
  checkInConfig: {
    earlyCheckInHours: {
      type: Number,
      default: 3,
      min: 0,
      max: 24,
      description: 'Hours before activity start when check-in becomes available'
    },
    requireEarlyCheckIn: {
      type: Boolean,
      default: false,
      description: 'Whether to enforce early check-in time limit'
    }
  },
  contactPerson: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String
  },
  // 显式状态 - 由管理员控制
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 1
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：计算时间状态
activitySchema.virtual('timeStatus').get(function() {
  const now = new Date();
  
  // 如果活动被取消，直接返回cancelled
  if (this.status === 'cancelled') {
    return 'cancelled';
  }
  
  // 如果活动已完成，直接返回completed
  if (this.status === 'completed') {
    return 'completed';
  }

  // 如果活动还是草稿状态
  if (this.status === 'draft') {
    return 'draft';
  }

  // 计算时间差（天数）
  const daysUntilStart = Math.ceil((this.startTime - now) / (1000 * 60 * 60 * 24));
  
  if (now > this.endTime) {
    return 'past';
  } else if (now >= this.startTime) {
    return 'ongoing';
  } else if (daysUntilStart <= 7) {
    return 'upcoming';
  } else {
    return 'planned';
  }
});

// 虚拟字段：是否可以报名
activitySchema.virtual('isRegisterable').get(function() {
  const now = new Date();
  return this.status === 'published' && 
         now < this.startTime && 
         this.currentParticipants < this.maxParticipants;
});

// 虚拟字段：是否可以签到
activitySchema.virtual('isCheckInEnabled').get(function() {
  const now = new Date();
  const checkInStartTime = new Date(this.startTime);
  
  // 如果不要求提前签到限制，只要在活动结束前都可以签到
  if (!this.checkInConfig.requireEarlyCheckIn) {
    return this.status === 'published' && now <= this.endTime;
  }
  
  // 否则需要在配置的提前时间内签到
  checkInStartTime.setHours(
    checkInStartTime.getHours() - (this.checkInConfig.earlyCheckInHours || 3)
  );

  return this.status === 'published' && 
         now >= checkInStartTime &&
         now <= this.endTime;
});

// 计算两点之间的距离（米）
activitySchema.methods.calculateDistance = function(latitude, longitude) {
  if (!this.location.latitude || !this.location.longitude) {
    return 0;
  }

  const R = 6371000; // 地球半径（米）
  const lat1 = this.location.latitude * Math.PI / 180;
  const lat2 = latitude * Math.PI / 180;
  const deltaLat = (latitude - this.location.latitude) * Math.PI / 180;
  const deltaLon = (longitude - this.location.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
           Math.cos(lat1) * Math.cos(lat2) *
           Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// 检查签到位置是否有效
activitySchema.methods.isLocationValid = function(latitude, longitude) {
  if (!this.location.requireLocation || !this.location.range) {
    return true;
  }

  if (!this.location.latitude || !this.location.longitude) {
    return true;
  }

  const distance = this.calculateDistance(latitude, longitude);
  return distance <= this.location.range;
};

// 验证并处理坐标
activitySchema.pre('save', function(next) {
  // 验证结束时间
  if (this.endTime <= this.startTime) {
    return next(new Error('结束时间必须晚于开始时间'));
  }

  // 如果提供了经纬度，则更新coordinates
  if (this.location.latitude != null && this.location.longitude != null) {
    this.location.coordinates = {
      type: 'Point',
      coordinates: [this.location.longitude, this.location.latitude]
    };
  } else {
    this.location.coordinates = undefined;
  }

  // 如果没有提供range，设为undefined
  if (this.location.range == null) {
    this.location.range = undefined;
  }

  next();
});

// 修改索引定义
activitySchema.index({ status: 1 });
activitySchema.index({ startTime: 1 });
activitySchema.index({ endTime: 1 });
activitySchema.index({ createdBy: 1 });
// 只对有coordinates的文档创建地理位置索引
activitySchema.index({ 'location.coordinates': '2dsphere' }, { sparse: true });

// 优化索引定义
activitySchema.index({ status: 1, startTime: 1 }); // 主要查询索引
activitySchema.index({ status: 1, endTime: 1 });   // 用于查询已结束活动
activitySchema.index({ 'location.name': 1, startTime: 1 }); // 按地点查询
activitySchema.index({ 
  'location.coordinates': '2dsphere',
  status: 1,
  startTime: 1
}, { 
  sparse: true 
}); // 地理位置查询优化

// 查询方法优化
activitySchema.statics.findActiveActivities = async function(queryOptions = {}) {
  return this.find({
    ...queryOptions,
    startTime: { $gte: new Date() }
  })
  .select('name description location startTime endTime status maxParticipants currentParticipants')
  .lean()
  .hint({ status: 1, startTime: 1 });
};

// 附近活动查询优化
activitySchema.statics.findNearbyActivities = async function(latitude, longitude, maxDistance = 5000) {
  return this.find({
    status: 'published',
    startTime: { $gte: new Date() },
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  })
  .select('name description location startTime endTime status maxParticipants currentParticipants')
  .lean()
  .hint({ 'location.coordinates': '2dsphere', status: 1, startTime: 1 });
};

// 查询优化中间件
activitySchema.pre('find', function() {
  // 默认使用lean查询
  if (!this._mongooseOptions.lean) {
    this.lean();
  }

  // 根据查询条件使用合适的索引
  if (this._conditions.status && this._conditions.startTime) {
    this.hint({ status: 1, startTime: 1 });
  }
});

module.exports = mongoose.model('Activity', activitySchema); 