import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  time: {
    type: String,
    default: 'Just now'
  }
}, { _id: false, timestamps: true });

const attachmentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  public_id: {
    type: String
  },
  date: {
    type: String,
    required: true
  }
}, { _id: false });

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['Assigned', 'Accepted', 'Denied', 'Started', 'In Progress', 'Under Review', 'Approved', 'Rejected', 'Completed', 'todo', 'in_progress', 'in_review', 'completed'],
      default: 'Assigned'
    },
    // New fields for enhanced workflow
    assignedToAll: {
      type: Boolean,
      default: false
    },
    assignmentStatus: {
      type: String,
      enum: ['pending', 'accepted', 'denied'],
      default: 'pending'
    },
    pendingStatusChange: {
      newStatus: { type: String },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date },
      approved: { type: Boolean }
    },
    dueDate: {
      type: String,
      required: [true, 'Due date is required']
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    progressNotes: {
      type: String,
      default: ''
    },
    reviewRequested: {
      type: Boolean,
      default: false
    },
    reviewFeedback: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    statusHistory: [
      {
        status: { type: String },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],
    activityTimeline: [
      {
        action: { type: String },
        details: { type: String },
        date: { type: Date, default: Date.now },
        user: { type: String }
      }
    ],
    tags: {
      type: [String],
      default: []
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    comments: {
      type: [commentSchema],
      default: []
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // optional fields for audit
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    deniedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    denialReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Auto-adjust progress to 100 when status is marked completed, and synchronize progress and progressPercentage
taskSchema.pre('save', function (next) {
  // Sync status compatibility
  if (this.status === 'completed') this.status = 'Completed';
  if (this.status === 'in_progress') this.status = 'In Progress';
  if (this.status === 'in_review') this.status = 'Under Review';
  if (this.status === 'todo') this.status = 'Assigned';

  if (this.status === 'Completed' || this.status === 'Approved') {
    this.progress = 100;
    this.progressPercentage = 100;
  }
  
  // Make sure progress and progressPercentage are in sync
  if (this.progress !== this.progressPercentage) {
    if (this.isModified('progressPercentage')) {
      this.progress = this.progressPercentage;
    } else {
      this.progressPercentage = this.progress;
    }
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
