import mongoose from 'mongoose';
import Team from '../models/Team.js';
import Task from '../models/Task.js';

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private (Admin)
export const getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('members', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single team by ID
// @route   GET /api/teams/:id
// @access  Private (Admin or Member)
export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members', 'name email role')
      .populate('createdBy', 'name email');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private (Admin)
export const createTeam = async (req, res) => {
  try {
    const { teamName, teamDescription, members } = req.body;

    const teamExists = await Team.findOne({ teamName });
    if (teamExists) {
      return res.status(400).json({ message: 'Team name already exists' });
    }

    const team = await Team.create({
      teamName,
      teamDescription,
      members: members || [],
      createdBy: req.user._id
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a team
// @route   PUT /api/teams/:id
// @access  Private (Admin)
export const updateTeam = async (req, res) => {
  try {
    const { teamName, teamDescription, members } = req.body;

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (teamName) {
      const teamExists = await Team.findOne({ teamName, _id: { $ne: team._id } });
      if (teamExists) {
        return res.status(400).json({ message: 'Team name already exists' });
      }
      team.teamName = teamName;
    }

    if (teamDescription !== undefined) {
      team.teamDescription = teamDescription;
    }

    if (members) {
      team.members = members;
    }

    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a team
// @route   DELETE /api/teams/:id
// @access  Private (Admin)
export const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if team has active tasks assigned
    const tasksAssigned = await Task.countDocuments({ assignedToTeam: team._id });
    if (tasksAssigned > 0) {
      return res.status(400).json({ message: 'Cannot delete team with assigned tasks' });
    }

    await Team.deleteOne({ _id: team._id });
    res.json({ message: 'Team removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get team analytics
// @route   GET /api/teams/stats/analytics
// @access  Private (Admin)
export const getTeamAnalytics = async (req, res) => {
  try {
    const teams = await Team.find().select('teamName members');
    
    const teamStats = await Promise.all(teams.map(async (team) => {
      const tasks = await Task.find({ assignedToTeam: team._id });
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Approved').length;
      const activeTasks = totalTasks - completedTasks;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        _id: team._id,
        teamName: team.teamName,
        memberCount: team.members.length,
        totalTasks,
        activeTasks,
        completedTasks,
        completionRate: Math.round(completionRate)
      };
    }));

    res.json(teamStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get tasks for a specific team
// @route   GET /api/teams/:id/tasks
// @access  Private (Admin or Member)
export const getTeamTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedToTeam: req.params.id })
      .populate('creator', 'name email')
      .populate('assignedTo', 'name email')
      .populate('responsibleUser', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get teams the current user belongs to
// @route   GET /api/teams/user/my-teams
// @access  Private
export const getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({ members: req.user._id })
      .populate('members', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Calculate quick stats for each team
    const teamsWithStats = await Promise.all(teams.map(async (team) => {
      const totalTasks = await Task.countDocuments({ assignedToTeam: team._id });
      const completedTasks = await Task.countDocuments({ 
        assignedToTeam: team._id, 
        status: { $in: ['Completed', 'Approved'] }
      });
      
      return {
        ...team.toObject(),
        stats: {
          totalTasks,
          activeTasks: totalTasks - completedTasks,
          completedTasks
        }
      };
    }));

    res.json(teamsWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
