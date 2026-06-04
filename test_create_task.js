import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Task from './models/Task.js';
import Team from './models/Team.js';
import User from './models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const adminUser = await User.findOne({ role: 'admin' });
  const frontendTeam = await Team.findOne({ teamName: 'frontend team' });
  
  if (!frontendTeam || !adminUser) {
    console.log("Missing team or admin", !!frontendTeam, !!adminUser);
    process.exit(1);
  }

  // Simulate what taskStore sends
  const body = {
    title: 'TEST TEAM TASK',
    description: 'This is a test task for the team',
    assignedType: 'team',
    assignedTo: '',
    assignedToTeam: frontendTeam._id.toString(),
    responsibleUser: '',
    priority: 'high',
    status: 'todo',
    dueDate: new Date().toISOString().split('T')[0],
    progress: 0,
    tags: ['test'],
    assignToAll: false
  };

  // Run the logic from createTask controller directly
  const task = await Task.create({
      title: body.title,
      description: body.description || '',
      assignedTo: body.assignedTo ? body.assignedTo : null,
      assignedType: body.assignedType || 'individual',
      assignedToTeam: body.assignedToTeam || null,
      responsibleUser: body.responsibleUser || null,
      assignedToAll: false,
      priority: body.priority || 'medium',
      status: body.status || 'Assigned',
      dueDate: body.dueDate,
      progress: body.progress || 0,
      progressPercentage: body.progress || 0,
      tags: body.tags || [],
      creator: adminUser._id,
      activityTimeline: [],
      statusHistory: []
  });

  console.log(`\nCreated task: ${task.title}`);
  console.log(`  assignedType: ${task.assignedType}`);
  console.log(`  assignedToTeam: ${task.assignedToTeam}`);
  console.log(`  assignedTo: ${task.assignedTo}`);

  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
