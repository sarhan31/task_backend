import Task from '../models/Task.js';
import User from '../models/User.js';
import TaskUpdate from '../models/TaskUpdate.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';

// Helper to check Cloudinary configuration status
const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const filters = {};
    // Filter by user role: standard users only see tasks assigned to them, created by them, or assigned to all
    if (req.user.role !== 'admin') {
      filters.$or = [
        { assignedTo: req.user._id },
        { creator: req.user._id },
        { assignedToAll: true }
      ];
    }

    // Apply query filters
    if (req.query.status && req.query.status !== 'all') {
      filters.status = req.query.status;
    }
    if (req.query.priority && req.query.priority !== 'all') {
      filters.priority = req.query.priority;
    }
    if (req.query.search) {
      filters.title = { $regex: req.query.search, $options: 'i' };
    }

    const tasks = await Task.find(filters)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Permission checks
    if (req.user.role !== 'admin' && 
        task.assignedTo?.toString() !== req.user._id.toString() &&
        task.creator?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can create tasks' });
  }
  try {
    const { title, description, assignedToEmail, assignToAll, priority, status, dueDate, progress, tags } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Please provide task title and due date' });
    }

    let assignedUser = null;
    let isAssignedToAll = assignToAll === true || assignToAll === 'true';

    if (!isAssignedToAll) {
      if (assignedToEmail) {
        assignedUser = await User.findOne({ email: assignedToEmail.toLowerCase() });
      } else if (req.body.assignedTo) {
        // Direct ID reference
        assignedUser = await User.findById(req.body.assignedTo);
      }

      if (assignedUser && assignedUser.status === 'fired') {
        return res.status(400).json({ message: 'Cannot assign tasks to a fired user' });
      }
    }

    const initStatus = status || 'Assigned';
    const initProgress = progress || 0;

    if (isAssignedToAll) {
      const users = await User.find({ role: { $ne: 'admin' }, status: { $ne: 'fired' } });
      if (users.length === 0) {
        return res.status(400).json({ message: 'No members found to assign the task to' });
      }

      const task = await Task.create({
        title,
        description: description || '',
        assignedTo: null,
        assignedToAll: true,
        priority: priority || 'medium',
        status: initStatus,
        dueDate,
        progress: initProgress,
        progressPercentage: initProgress,
        tags: tags || [],
        creator: req.user._id,
        activityTimeline: [
          {
            action: 'Task Created',
            details: `Task was created by ${req.user.name}`,
            user: req.user.name,
            date: new Date()
          },
          {
            action: 'Task Assigned',
            details: 'Task was assigned to all non-admin members',
            user: req.user.name,
            date: new Date()
          }
        ],
        statusHistory: [
          {
            status: initStatus,
            updatedBy: req.user._id,
            updatedAt: new Date()
          }
        ]
      });

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'name email role')
        .populate('creator', 'name email');

      return res.status(201).json(populatedTask);
    }

    const task = await Task.create({
      title,
      description: description || '',
      assignedTo: assignedUser ? assignedUser._id : null,
      assignedToAll: false,
      priority: priority || 'medium',
      status: initStatus,
      dueDate,
      progress: initProgress,
      progressPercentage: initProgress,
      tags: tags || [],
      creator: req.user._id,
      activityTimeline: [
        {
          action: 'Task Created',
          details: `Task was created by ${req.user.name}`,
          user: req.user.name,
          date: new Date()
        },
        {
          action: 'Task Assigned',
            details: assignedUser ? `Task was assigned to ${assignedUser.name}` : 'Task was created without an assignee',
          user: req.user.name,
          date: new Date()
        }
      ],
      statusHistory: [
        {
          status: initStatus,
          updatedBy: req.user._id,
          updatedAt: new Date()
        }
      ]
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Auth validation — two-tier:
    // Tier 1: Admins and creators can update all fields.
    // Tier 2: The assignedTo user can update progress/status/comments only.
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.creator.toString() === req.user._id.toString();
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ message: 'Forbidden: you do not have permission to update this task' });
    }

    // Only admins/creators can change core fields
    const isAssignedToParticularUser = task.assignedTo && !task.assignedToAll;

    if (isAssignedToParticularUser && (isAdmin || isCreator)) {
      // Admin/Creator: restrict to status/comments only if assigned to a user
      task.status = req.body.status || task.status;
      if (req.body.comments) {
        task.comments = req.body.comments;
      }
    } else if (!isAdmin && !isCreator) {
      // Assignee-only: restrict to progress/status/comments updates
      task.status = req.body.status || task.status;
      task.progress = req.body.progress !== undefined ? req.body.progress : task.progress;
      if (req.body.comments) {
        task.comments = req.body.comments;
      }
    } else {
      // Admin or creator (unassigned/assignedToAll tasks): full update
      let assignedUser = task.assignedTo;
      if (req.body.assignedToEmail) {
        const found = await User.findOne({ email: req.body.assignedToEmail.toLowerCase() });
        if (!found) {
          return res.status(400).json({ message: 'Selected assignee was not found' });
        }
        if (found.status === 'fired') {
          return res.status(400).json({ message: 'Cannot assign tasks to a fired user' });
        }
        assignedUser = found._id;
      } else if (req.body.assignedTo) {
        const found = await User.findById(req.body.assignedTo);
        if (!found) {
          return res.status(400).json({ message: 'Selected assignee was not found' });
        }
        if (found.status === 'fired') {
          return res.status(400).json({ message: 'Cannot assign tasks to a fired user' });
        }
        assignedUser = found._id;
      }

      task.title = req.body.title || task.title;
      task.description = req.body.description !== undefined ? req.body.description : task.description;
      task.assignedTo = assignedUser;
      task.priority = req.body.priority || task.priority;
      task.status = req.body.status || task.status;
      task.dueDate = req.body.dueDate || task.dueDate;
      task.progress = req.body.progress !== undefined ? req.body.progress : task.progress;
      task.tags = req.body.tags || task.tags;

      if (req.body.comments) {
        task.comments = req.body.comments;
      }
    }

    const updatedTask = await task.save();
    
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Permission check
    if (req.user.role !== 'admin' && task.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: only creator or admin can delete task' });
    }

    // Delete cloud assets first if any
    for (const att of task.attachments) {
      if (att.public_id && isCloudinaryConfigured()) {
        try {
          await cloudinary.uploader.destroy(att.public_id);
        } catch (e) {
          console.error(`Failed to delete asset ${att.public_id} from cloud:`, e);
        }
      }
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task status / progress only (for quick-board actions)
// @route   PATCH /api/tasks/:id/status
// @access  Private
export const updateTaskStatus = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Standard user can update status if assigned
    if (req.user.role !== 'admin' && 
        task.assignedTo?.toString() !== req.user._id.toString() &&
        task.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to change this task status' });
    }

    if (req.body.status) {
      task.status = req.body.status;
    }
    if (req.body.progress !== undefined) {
      task.progress = req.body.progress;
    }

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload file attachment to a task
// @route   POST /api/tasks/:id/attachments
// @access  Private
export const uploadAttachment = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    let fileUrl = '';
    let publicId = '';

    const tempFilePath = req.file.path;
    const fileBytes = req.file.size;
    const fileSizeFormatted = `${(fileBytes / (1024 * 1024)).toFixed(1)} MB`;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' ? 'image' : ext.replace('.', '');

    if (isCloudinaryConfigured()) {
      try {
        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
          folder: 'taskmanager_attachments',
          resource_type: 'auto'
        });
        fileUrl = uploadResult.secure_url;
        publicId = uploadResult.public_id;
        
        // Remove local file
        fs.unlinkSync(tempFilePath);
      } catch (cloudErr) {
        console.error('Cloudinary upload failed, falling back to local storage URL:', cloudErr.message);
        fileUrl = `/uploads/${req.file.filename}`;
      }
    } else {
      // Local fallback url pathing
      fileUrl = `/uploads/${req.file.filename}`;
    }

    const newAttachment = {
      id: `att-${Date.now()}`,
      name: req.file.originalname,
      type: fileType,
      size: fileSizeFormatted,
      url: fileUrl,
      public_id: publicId || null,
      date: new Date().toISOString().split('T')[0]
    };

    task.attachments.push(newAttachment);
    await task.save();

    res.status(201).json({
      message: 'Attachment uploaded successfully',
      attachment: newAttachment,
      task
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a file attachment from task
// @route   DELETE /api/tasks/:id/attachments/:attachmentId
// @access  Private
export const deleteAttachment = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const attachmentIndex = task.attachments.findIndex(a => a.id === req.params.attachmentId);

    if (attachmentIndex === -1) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const attachment = task.attachments[attachmentIndex];

    // Delete asset from cloudinary
    if (attachment.public_id && isCloudinaryConfigured()) {
      try {
        await cloudinary.uploader.destroy(attachment.public_id);
      } catch (err) {
        console.error('Failed to delete asset from Cloudinary:', err.message);
      }
    } else if (attachment.url.startsWith('/uploads/')) {
      // Remove local file if stored locally
      const localPath = path.join(process.cwd(), attachment.url);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    res.json({ message: 'Attachment deleted successfully', task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Start a task
// @route   POST /api/tasks/:id/start
// @access  Private
export const startTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Auth validation: only assigned user or creator or admin can start
    if (req.user.role !== 'admin' && 
        task.assignedTo?.toString() !== req.user._id.toString() &&
        task.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const prevStatus = task.status;
    task.status = 'Started';
    
    // Add to history and timeline
    task.statusHistory.push({ status: 'Started', updatedBy: req.user._id, updatedAt: new Date() });
    task.activityTimeline.push({
      action: 'Task Started',
      details: `${req.user.name} started the task`,
      user: req.user.name,
      date: new Date()
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a task progress update
// @route   POST /api/tasks/:id/progress
// @access  Private
export const submitProgressUpdate = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const { percentage, note } = req.body;
    if (percentage === undefined || !note) {
      return res.status(400).json({ message: 'Percentage and note are required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Auth validation
    if (req.user.role !== 'admin' && 
        task.assignedTo?.toString() !== req.user._id.toString() &&
        task.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update progress' });
    }

    let newAttachment = null;
    if (req.file) {
      let fileUrl = '';
      let publicId = '';
      const tempFilePath = req.file.path;
      const fileBytes = req.file.size;
      const fileSizeFormatted = `${(fileBytes / (1024 * 1024)).toFixed(1)} MB`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileType = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' ? 'image' : ext.replace('.', '');

      if (isCloudinaryConfigured()) {
        try {
          const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'taskmanager_attachments',
            resource_type: 'auto'
          });
          fileUrl = uploadResult.secure_url;
          publicId = uploadResult.public_id;
          fs.unlinkSync(tempFilePath);
        } catch (cloudErr) {
          console.error('Cloudinary upload failed, falling back to local storage URL:', cloudErr.message);
          fileUrl = `/uploads/${req.file.filename}`;
        }
      } else {
        fileUrl = `/uploads/${req.file.filename}`;
      }

      newAttachment = {
        id: `att-${Date.now()}`,
        name: req.file.originalname,
        type: fileType,
        size: fileSizeFormatted,
        url: fileUrl,
        public_id: publicId || null,
        date: new Date().toISOString().split('T')[0]
      };

      task.attachments.push(newAttachment);
      task.activityTimeline.push({
        action: 'Attachment Uploaded',
        details: `Uploaded file "${newAttachment.name}"`,
        user: req.user.name,
        date: new Date()
      });
    }

    // Update progress
    const numericPercentage = Number(percentage);
    task.progressPercentage = numericPercentage;
    task.progress = numericPercentage;
    task.progressNotes = note;

    // Transition status if applicable (request status change to In Progress)
    let statusChanged = false;
    if (task.status === 'Assigned' || task.status === 'Started' || task.status === 'Rejected' || task.status === 'Accepted') {
      task.pendingStatusChange = {
        newStatus: 'In Progress',
        requestedBy: req.user._id,
        requestedAt: new Date(),
        approved: false
      };
      
      task.activityTimeline.push({
        action: 'Status Change Requested',
        details: `${req.user.name} requested to change status to "In Progress" via progress submission`,
        user: req.user.name,
        date: new Date()
      });
      statusChanged = true;
    }

    // Add Timeline Event
    task.activityTimeline.push({
      action: 'Progress Updated',
      details: `Updated progress to ${numericPercentage}% - "${note}"`,
      user: req.user.name,
      date: new Date()
    });

    // Create TaskUpdate Record
    const taskUpdate = await TaskUpdate.create({
      task: task._id,
      percentage: numericPercentage,
      note,
      attachment: newAttachment,
      updatedBy: req.user._id
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.status(200).json({ task: populated, update: taskUpdate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request task review
// @route   POST /api/tasks/:id/request-review
// @access  Private
export const requestTaskReview = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only assigned user, creator, or admin can request review
    if (req.user.role !== 'admin' && 
        task.assignedTo?.toString() !== req.user._id.toString() &&
        task.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    task.status = 'Under Review';
    task.reviewRequested = true;

    task.statusHistory.push({ status: 'Under Review', updatedBy: req.user._id, updatedAt: new Date() });
    task.activityTimeline.push({
      action: 'Review Requested',
      details: `Submitted task work and requested a review from Admin`,
      user: req.user.name,
      date: new Date()
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve task completion
// @route   POST /api/tasks/:id/approve
// @access  Private/Admin
export const approveTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can approve tasks' });
  }
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'Completed';
    task.progressPercentage = 100;
    task.progress = 100;
    task.reviewRequested = false;
    task.approvedBy = req.user._id;
    task.approvedAt = new Date();

    task.statusHistory.push({ status: 'Approved', updatedBy: req.user._id, updatedAt: new Date() });
    task.statusHistory.push({ status: 'Completed', updatedBy: req.user._id, updatedAt: new Date() });
    
    task.activityTimeline.push({
      action: 'Task Approved',
      details: `Task was approved by Admin ${req.user.name}`,
      user: req.user.name,
      date: new Date()
    });
    task.activityTimeline.push({
      action: 'Task Completed',
      details: `Task successfully closed`,
      user: req.user.name,
      date: new Date()
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email')
      .populate('approvedBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject task completion with feedback
// @route   POST /api/tasks/:id/reject
// @access  Private/Admin
export const rejectTask = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can reject tasks' });
  }
  try {
    const { feedback } = req.body;
    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required to reject a task' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'Rejected';
    task.reviewRequested = false;
    task.reviewFeedback = feedback;

    task.statusHistory.push({ status: 'Rejected', updatedBy: req.user._id, updatedAt: new Date() });
    task.activityTimeline.push({
      action: 'Task Rejected',
      details: `Task work rejected with feedback: "${feedback}"`,
      user: req.user.name,
      date: new Date()
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get progress updates list for a task
// @route   GET /api/tasks/:id/updates
// @access  Private
export const getTaskUpdates = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Auth check
    if (req.user.role !== 'admin' && 
        task.assignedTo?.toString() !== req.user._id.toString() &&
        task.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = await TaskUpdate.find({ task: req.params.id })
      .populate('updatedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept task assignment
// @route   POST /api/tasks/:id/accept
// @access  Private
export const acceptTaskAssignment = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can accept: either assigned to them specifically OR assigned to all
    const canAccept = task.assignedToAll || 
                      (task.assignedTo && task.assignedTo.toString() === req.user._id.toString());
    
    if (!canAccept) {
      return res.status(403).json({ message: 'This task is not assigned to you' });
    }

    if (task.assignmentStatus === 'accepted') {
      return res.status(400).json({ message: 'Task already accepted' });
    }

    // For tasks assigned to all, we need to track individual acceptances
    // For now, we'll just update the status for the user's view
    task.assignmentStatus = 'accepted';
    task.status = 'Accepted';
    
    // If assigned to all, set the assignedTo to current user after acceptance
    if (task.assignedToAll && !task.assignedTo) {
      task.assignedTo = req.user._id;
    }
    
    task.statusHistory.push({ 
      status: 'Accepted', 
      updatedBy: req.user._id, 
      updatedAt: new Date() 
    });
    
    task.activityTimeline.push({
      action: 'Task Accepted',
      details: `${req.user.name} accepted the task assignment`,
      user: req.user.name,
      date: new Date()
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deny task assignment
// @route   POST /api/tasks/:id/deny
// @access  Private
export const denyTaskAssignment = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const { reason } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can deny: either assigned to them specifically OR assigned to all
    const canDeny = task.assignedToAll || 
                    (task.assignedTo && task.assignedTo.toString() === req.user._id.toString());
    
    if (!canDeny) {
      return res.status(403).json({ message: 'This task is not assigned to you' });
    }

    task.assignmentStatus = 'denied';
    task.status = 'Denied';
    task.deniedBy = req.user._id;
    task.denialReason = reason || 'No reason provided';
    
    task.statusHistory.push({ 
      status: 'Denied', 
      updatedBy: req.user._id, 
      updatedAt: new Date() 
    });
    
    task.activityTimeline.push({
      action: 'Task Denied',
      details: `${req.user.name} denied the task assignment. Reason: ${task.denialReason}`,
      user: req.user.name,
      date: new Date()
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email')
      .populate('deniedBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request status change (user submits, admin must approve)
// @route   POST /api/tasks/:id/request-status-change
// @access  Private
export const requestStatusChange = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const { newStatus } = req.body;
    if (!newStatus) {
      return res.status(400).json({ message: 'New status is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can request status change
    const canRequest = task.assignedToAll || 
                       (task.assignedTo && task.assignedTo.toString() === req.user._id.toString());
    
    if (!canRequest) {
      return res.status(403).json({ message: 'Not authorized to change this task status' });
    }

    // Check if task is accepted
    if (task.assignmentStatus !== 'accepted') {
      return res.status(400).json({ message: 'You must accept the task before changing its status' });
    }

    task.pendingStatusChange = {
      newStatus,
      requestedBy: req.user._id,
      requestedAt: new Date(),
      approved: false
    };
    
    task.activityTimeline.push({
      action: 'Status Change Requested',
      details: `${req.user.name} requested to change status to "${newStatus}"`,
      user: req.user.name,
      date: new Date()
    });

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email')
      .populate('pendingStatusChange.requestedBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve status change
// @route   POST /api/tasks/:id/approve-status-change
// @access  Private/Admin
export const approveStatusChange = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can approve status changes' });
  }
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.pendingStatusChange || !task.pendingStatusChange.newStatus) {
      return res.status(400).json({ message: 'No pending status change to approve' });
    }

    const oldStatus = task.status;
    const newStatus = task.pendingStatusChange.newStatus;

    task.status = newStatus;
    task.pendingStatusChange.approved = true;
    
    task.statusHistory.push({ 
      status: newStatus, 
      updatedBy: req.user._id, 
      updatedAt: new Date() 
    });
    
    task.activityTimeline.push({
      action: 'Status Change Approved',
      details: `Admin ${req.user.name} approved status change from "${oldStatus}" to "${newStatus}"`,
      user: req.user.name,
      date: new Date()
    });

    // Clear pending status change after approval
    task.pendingStatusChange = undefined;

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject status change
// @route   POST /api/tasks/:id/reject-status-change
// @access  Private/Admin
export const rejectStatusChange = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can reject status changes' });
  }
  try {
    const { feedback } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.pendingStatusChange || !task.pendingStatusChange.newStatus) {
      return res.status(400).json({ message: 'No pending status change to reject' });
    }

    const requestedStatus = task.pendingStatusChange.newStatus;
    
    task.activityTimeline.push({
      action: 'Status Change Rejected',
      details: `Admin ${req.user.name} rejected status change to "${requestedStatus}". Feedback: ${feedback || 'None'}`,
      user: req.user.name,
      date: new Date()
    });

    // Clear pending status change
    task.pendingStatusChange = undefined;

    const updatedTask = await task.save();
    const populated = await Task.findById(updatedTask._id)
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending approvals (admin only)
// @route   GET /api/tasks/pending-approvals
// @access  Private/Admin
export const getPendingApprovals = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can view pending approvals' });
  }
  try {
    const tasks = await Task.find({
      'pendingStatusChange.newStatus': { $exists: true, $ne: null },
      'pendingStatusChange.approved': false
    })
      .populate('assignedTo', 'name email role')
      .populate('creator', 'name email')
      .populate('pendingStatusChange.requestedBy', 'name email')
      .sort({ 'pendingStatusChange.requestedAt': -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
