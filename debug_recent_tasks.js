import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Task from './models/Task.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const tasks = await Task.find().sort({ createdAt: -1 }).limit(5);
  console.log('\n=== RECENT TASKS ===');
  tasks.forEach(t => {
    console.log(`\nTask: ${t.title}`);
    console.log(`  assignedType: ${t.assignedType}`);
    console.log(`  assignedToTeam: ${t.assignedToTeam}`);
    console.log(`  assignedTo: ${t.assignedTo}`);
    console.log(`  responsibleUser: ${t.responsibleUser}`);
  });

  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
