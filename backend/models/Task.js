const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Task title must be at least 1 character'
    }
  },
  description: {
    type: String,
    default: '',
    maxlength: [1000, 'Task description cannot exceed 1000 characters'],
    trim: true
  },
  status: {
    type: String,
    required: [true, 'Task status is required'],
    enum: {
      values: ['todo', 'inprogress', 'done'],
      message: 'Status must be one of: todo, inprogress, done'
    },
    default: 'todo'
  },
  order: {
    type: Number,
    default: 0,
    min: [0, 'Order must be a non-negative number']
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

// Update the updatedAt field before saving
TaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound indexes for better query performance
TaskSchema.index({ projectId: 1, status: 1, order: 1 });
TaskSchema.index({ projectId: 1, createdAt: -1 });
TaskSchema.index({ status: 1, order: 1 });

// Text index for search functionality
TaskSchema.index({ title: 'text', description: 'text' });

// Virtual to populate project information when needed
TaskSchema.virtual('project', {
  ref: 'Project',
  localField: 'projectId',
  foreignField: '_id',
  justOne: true
});

// Static method to get tasks by project and status
TaskSchema.statics.getByProjectAndStatus = function(projectId, status) {
  return this.find({ projectId, status }).sort({ order: 1, createdAt: 1 });
};

// Static method to get all tasks for a project grouped by status
TaskSchema.statics.getByProjectGrouped = function(projectId) {
  return this.aggregate([
    { $match: { projectId: mongoose.Types.ObjectId(projectId) } },
    { $sort: { status: 1, order: 1, createdAt: 1 } },
    {
      $group: {
        _id: '$status',
        tasks: { $push: '$$ROOT' }
      }
    }
  ]);
};

// Instance method to move task to different status
TaskSchema.methods.moveToStatus = function(newStatus, newOrder = 0) {
  this.status = newStatus;
  this.order = newOrder;
  this.updatedAt = Date.now();
  return this.save();
};

module.exports = mongoose.model('Task', TaskSchema);