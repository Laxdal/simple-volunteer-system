const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['registered', 'cancelled', 'completed', 'absent'],
    default: 'registered'
  },
  registrationTime: {
    type: Date,
    default: Date.now
  },
  checkIn: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: false
      }
    },
    device: {
      type: String,
      required: false
    }
  },
  checkOut: {
    time: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: false
      }
    }
  },
  participationHours: {
    type: Number,
    default: 0
  },
  notes: String
}, {
  timestamps: true
});

// 创建复合索引
participationSchema.index({ user: 1, activity: 1 }, { unique: true });
participationSchema.index({ activity: 1, status: 1 });
participationSchema.index({ user: 1, status: 1 });

// 计算参与时长的方法
participationSchema.methods.calculateParticipationHours = function() {
  if (this.checkIn?.time && this.checkOut?.time) {
    const hours = (this.checkOut.time - this.checkIn.time) / (1000 * 60 * 60);
    this.participationHours = Math.round(hours * 100) / 100; // 保留两位小数
  }
};

// 保存前自动计算参与时长
participationSchema.pre('save', function(next) {
  if (this.checkIn?.time && this.checkOut?.time) {
    this.calculateParticipationHours();
  }
  next();
});

module.exports = mongoose.model('Participation', participationSchema); 