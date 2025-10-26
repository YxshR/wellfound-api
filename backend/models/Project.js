const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Project name must be at least 1 character'
    }
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Project description cannot exceed 500 characters'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  columns: [{
    _id: false,
    id: {
      type: String,
      required: [true, 'Column id is required']
    },
    title: {
      type: String,
      required: [true, 'Column title is required'],
      trim: true
    },
    order: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Default columns for new projects
ProjectSchema.pre('save', function(next) {
  if (this.isNew && (!this.columns || this.columns.length === 0)) {
    this.columns = [
      { id: 'todo', title: 'To Do', order: 0 },
      { id: 'inprogress', title: 'In Progress', order: 1 },
      { id: 'done', title: 'Done', order: 2 }
    ];
  }
  next();
});

// Virtual for task count (will be populated when needed)
ProjectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'projectId',
  count: true
});

// Index for better query performance
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Project', ProjectSchema);