import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Team from './models/Team.js';
import Task from './models/Task.js';
import User from './models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // 1. List all teams with their members
  const teams = await Team.find().populate('members', 'name email');
  console.log('\n=== TEAMS ===');
  teams.forEach(t => {
    console.log(`Team: ${t.teamName} (${t._id})`);
    console.log(`  Members: ${t.members.map(m => `${m.name} (${m._id})`).join(', ') || 'NONE'}`);
  });

  // 2. List all tasks that have assignedToTeam set
  const teamTasks = await Task.find({ assignedToTeam: { $ne: null } })
    .populate('assignedToTeam', 'teamName')
    .populate('assignedTo', 'name email')
    .populate('responsibleUser', 'name email');
  
  console.log('\n=== TASKS WITH TEAM ASSIGNMENT ===');
  if (teamTasks.length === 0) {
    console.log('  NO tasks found with assignedToTeam set!');
  }
  teamTasks.forEach(t => {
    console.log(`Task: "${t.title}" (${t._id})`);
    console.log(`  assignedType: ${t.assignedType}`);
    console.log(`  assignedToTeam: ${t.assignedToTeam ? t.assignedToTeam.teamName + ' (' + t.assignedToTeam._id + ')' : 'NULL'}`);
    console.log(`  assignedTo: ${t.assignedTo ? t.assignedTo.name : 'NULL'}`);
    console.log(`  responsibleUser: ${t.responsibleUser ? t.responsibleUser.name : 'NULL'}`);
    console.log(`  status: ${t.status}`);
  });

  // 3. For each non-admin user, check what teams they belong to and what team tasks they should see
  const users = await User.find({ role: { $ne: 'admin' } }).select('name email');
  console.log('\n=== USER TEAM VISIBILITY ===');
  for (const u of users) {
    const userTeams = await Team.find({ members: u._id }).select('_id teamName');
    const teamIds = userTeams.map(t => t._id);
    const visibleTeamTasks = await Task.find({ assignedToTeam: { $in: teamIds } }).select('title');
    console.log(`User: ${u.name} (${u._id})`);
    console.log(`  Teams: ${userTeams.map(t => t.teamName).join(', ') || 'NONE'}`);
    console.log(`  Visible team tasks: ${visibleTeamTasks.map(t => t.title).join(', ') || 'NONE'}`);
  }

  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
