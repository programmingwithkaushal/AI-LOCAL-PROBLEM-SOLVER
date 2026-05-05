const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Problem = require('../models/Problem');

// Admin login using environment variables
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check against environment variables
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'Admin credentials not configured' });
    }
    
    if (email !== ADMIN_EMAIL) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    // Compare password with bcrypt hash
    const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    // Generate admin token
    const token = jwt.sign(
      { 
        email: ADMIN_EMAIL,
        role: 'admin',
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      admin: {
        email: ADMIN_EMAIL,
        name: 'Administrator',
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get overview statistics
const getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProblems = await Problem.countDocuments();
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    
    // Count total comments (aggregated from problems)
    const problemsWithComments = await Problem.find({ 'comments.0': { $exists: true } });
    const totalComments = problemsWithComments.reduce((total, problem) => {
      return total + (problem.comments ? problem.comments.length : 0);
    }, 0);
    
    res.json({
      totalUsers,
      totalProblems,
      totalComments,
      blockedUsers
    });
    
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all users with stats
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    // Add problem and comment counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const problemsCount = await Problem.countDocuments({ userId: user._id });
        
        const userProblems = await Problem.find({ userId: user._id });
        const commentsCount = userProblems.reduce((total, problem) => {
          return total + (problem.comments ? problem.comments.length : 0);
        }, 0);
        
        return {
          ...user.toObject(),
          problemsCount,
          commentsCount
        };
      })
    );
    
    res.json(usersWithStats);
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Block user
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User blocked successfully' });
    
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Unblock user
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: false },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User unblocked successfully' });
    
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all problems
const getProblems = async (req, res) => {
  try {
    const problems = await Problem.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(problems);
    
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete problem
const deleteProblem = async (req, res) => {
  try {
    const { problemId } = req.params;
    
    const problem = await Problem.findByIdAndDelete(problemId);
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json({ message: 'Problem deleted successfully' });
    
  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all comments
const getComments = async (req, res) => {
  try {
    const problems = await Problem.find({ 'comments.0': { $exists: true } })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    const allComments = [];
    
    problems.forEach(problem => {
      if (problem.comments && problem.comments.length > 0) {
        problem.comments.forEach(comment => {
          allComments.push({
            ...comment.toObject(),
            problemId: problem._id,
            problemTitle: problem.title
          });
        });
      }
    });
    
    // Sort comments by creation date (newest first)
    allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(allComments);
    
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Find problem containing this comment
    const problem = await Problem.findOne({ 'comments._id': commentId });
    
    if (!problem) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Remove comment from problem
    problem.comments = problem.comments.filter(
      comment => comment._id.toString() !== commentId
    );
    
    await problem.save();
    
    res.json({ message: 'Comment deleted successfully' });
    
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all chat messages
const getChatMessages = async (req, res) => {
  try {
    // This would require a Chat model to be implemented
    // For now, return empty array
    res.json([]);
    
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete chat message
const deleteChatMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // This would require a Chat model to be implemented
    // For now, return success
    res.json({ message: 'Chat message deleted successfully' });
    
  } catch (error) {
    console.error('Delete chat message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get detailed user information
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's problems
    const problems = await Problem.find({ userId: user._id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    // Get user's comments from all problems
    const allComments = [];
    problems.forEach(problem => {
      if (problem.comments && problem.comments.length > 0) {
        problem.comments.forEach(comment => {
          allComments.push({
            ...comment.toObject(),
            problemTitle: problem.title,
            problemId: problem._id
          });
        });
      }
    });
    
    // Sort comments by creation date (newest first)
    allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get problems user voted on
    const votedProblems = await Problem.find({ votedBy: user._id })
      .select('title category status createdAt')
      .sort({ createdAt: -1 });
    
    // Add votedAt timestamp (this would need to be stored separately in a real implementation)
    const votedProblemsWithTimestamp = votedProblems.map(problem => ({
      ...problem.toObject(),
      votedAt: problem.createdAt // Using problem createdAt as placeholder
    }));
    
    const userDetails = {
      ...user.toObject(),
      problems,
      comments: allComments,
      votedProblems: votedProblemsWithTimestamp,
      problemsCount: problems.length,
      commentsCount: allComments.length,
      votesCount: votedProblems.length
    };
    
    res.json(userDetails);
    
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete all user content
const deleteAllUserContent = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete all problems by user
    await Problem.deleteMany({ userId });
    
    // Remove user from all votedBy arrays
    await Problem.updateMany(
      { votedBy: userId },
      { $pull: { votedBy: userId } }
    );
    
    res.json({ message: 'All user content deleted successfully' });
    
  } catch (error) {
    console.error('Delete all user content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete user account and all content
const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete all problems by user
    await Problem.deleteMany({ userId });
    
    // Remove user from all votedBy arrays
    await Problem.updateMany(
      { votedBy: userId },
      { $pull: { votedBy: userId } }
    );
    
    // Delete the user account
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User account and all content deleted successfully' });
    
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete individual user vote
const deleteUserVote = async (req, res) => {
  try {
    const { userId, problemId } = req.params;
    
    // Remove user from the specific problem's votedBy array
    const result = await Problem.updateOne(
      { _id: problemId, votedBy: userId },
      { $pull: { votedBy: userId } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Problem or vote not found' });
    }
    
    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'User has not voted on this problem' });
    }
    
    // Decrement the votes count for the problem
    await Problem.updateOne(
      { _id: problemId },
      { $inc: { votes: -1 } }
    );
    
    res.json({ message: 'Vote deleted successfully' });
    
  } catch (error) {
    console.error('Delete user vote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update problem status
const updateProblemStatus = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { status } = req.body;
    
    if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Open, In Progress, or Resolved' });
    }
    
    const problem = await Problem.findById(problemId).populate('userId', 'name email');
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Update status and add to history
    problem.status = status;
    if (!problem.statusHistory) {
      problem.statusHistory = [];
    }
    problem.statusHistory.push({
      status: status,
      changedAt: new Date(),
      changedBy: null // Admin update (no specific user)
    });
    
    await problem.save();
    
    // Convert ObjectIds to strings for frontend compatibility
    const serializedProblem = {
      ...problem.toObject(),
      id: problem._id.toString(),
      userId: problem.userId ? problem.userId._id?.toString() || problem.userId.toString() : null,
      votedBy: problem.votedBy.map(id => id.toString())
    };
    
    res.json(serializedProblem);
    
  } catch (error) {
    console.error('Update problem status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search problem by ID
const searchProblemById = async (req, res) => {
  try {
    const { problemId } = req.params;
    
    const problem = await Problem.findOne({ problemId: problemId })
      .populate('userId', 'name email');
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    // Convert ObjectIds to strings for frontend compatibility
    const serializedProblem = {
      ...problem.toObject(),
      id: problem._id.toString(),
      userId: problem.userId ? problem.userId._id?.toString() || problem.userId.toString() : null,
      votedBy: problem.votedBy.map(id => id.toString())
    };
    
    res.json(serializedProblem);
    
  } catch (error) {
    console.error('Search problem by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get detailed user information for admin
const getUserDetailsForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's problems count
    const problemsCount = await Problem.countDocuments({ userId: user._id });
    
    // Get user's comments count
    const userProblems = await Problem.find({ userId: user._id });
    const commentsCount = userProblems.reduce((total, problem) => {
      return total + (problem.comments ? problem.comments.length : 0);
    }, 0);
    
    // Get user's votes count
    const votesCount = await Problem.countDocuments({ votedBy: user._id });
    
    // Add statistics to user object
    const userWithStats = {
      ...user.toObject(),
      statistics: {
        problemsCount,
        commentsCount,
        votesCount
      }
    };
    
    res.json(userWithStats);
    
  } catch (error) {
    console.error('Get user details for admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user profile (admin)
const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, profile } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update allowed fields
    if (name) user.name = name.trim();
    
    if (profile) {
      // Update profile fields
      if (profile.age !== undefined) user.profile.age = profile.age;
      if (profile.gender) user.profile.gender = profile.gender;
      if (profile.bio !== undefined) user.profile.bio = profile.bio.trim();
      if (profile.location !== undefined) user.profile.location = profile.location.trim();
      if (profile.phone !== undefined) user.profile.phone = profile.phone.trim();
      if (profile.socialMedia) {
        user.profile.socialMedia = {
          twitter: profile.socialMedia.twitter || user.profile.socialMedia.twitter,
          linkedin: profile.socialMedia.linkedin || user.profile.socialMedia.linkedin,
          facebook: profile.socialMedia.facebook || user.profile.socialMedia.facebook,
          instagram: profile.socialMedia.instagram || user.profile.socialMedia.instagram
        };
      }
    }
    
    await user.save();
    
    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;
    
    res.json({ user: updatedUser });
    
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Server error updating user profile' });
  }
};

module.exports = {
  adminLogin,
  getOverview,
  getUsers,
  blockUser,
  unblockUser,
  getProblems,
  deleteProblem,
  getComments,
  deleteComment,
  getChatMessages,
  deleteChatMessage,
  getUserDetails,
  deleteAllUserContent,
  deleteUserAccount,
  deleteUserVote,
  updateProblemStatus,
  searchProblemById,
  getUserDetailsForAdmin,
  updateUserProfile
};
