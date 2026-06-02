import mongoose from 'mongoose';

const taskUpdateSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  note: {
    type: String,
    required: true
  },
  attachment: {
    id: String,
    name: String,
    type: String,
    size: String,
    url: String,
    public_id: String,
    date: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const TaskUpdate = mongoose.model('TaskUpdate', taskUpdateSchema);
export default TaskUpdate;
