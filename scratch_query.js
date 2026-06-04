import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // root .env

const TaskSchema = new mongoose.Schema({}, { strict: false });
const TeamSchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });

const Task = mongoose.model('Task', TaskSchema);
const Team = mongoose.model('Team', TeamSchema);
const User = mongoose.model('User', UserSchema);

async function run() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager');
    console.log('Connected!');

    const tasks = await Task.find({})
      .populate('assignedTo', 'name email')
      .populate('assignedToTeam', 'teamName')
      .populate('responsibleUser', 'name email')
      .lean();

    console.log(`Found ${tasks.length} tasks:`);
    for (const t of tasks) {
      console.log('----------------------------------------');
      console.log('ID:', t._id);
      console.log('Title:', t.title);
      console.log('AssignedType:', t.assignedType);
      console.log('AssignedTo:', JSON.stringify(t.assignedTo));
      console.log('AssignedToTeam:', JSON.stringify(t.assignedToTeam));
      console.log('ResponsibleUser:', JSON.stringify(t.responsibleUser));
      console.log('AssignedToAll:', t.assignedToAll);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
