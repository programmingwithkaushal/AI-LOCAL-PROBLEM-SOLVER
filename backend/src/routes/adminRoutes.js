const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {
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
} = require('../controllers/adminController');

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if this is an admin token
    if (decoded.type !== 'admin' || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Admin login (no token required)
router.post('/login', adminLogin);

// All other routes require admin token
router.use(verifyAdminToken);

// Overview statistics
router.get('/overview', getOverview);

// User management
router.get('/users', getUsers);
router.get('/users/:userId/details', getUserDetails);
router.get('/users/:userId/admin-details', getUserDetailsForAdmin);
router.patch('/users/:userId/block', blockUser);
router.patch('/users/:userId/unblock', unblockUser);
router.patch('/users/:userId/profile', updateUserProfile);
router.delete('/users/:userId/content', deleteAllUserContent);
router.delete('/users/:userId', deleteUserAccount);
router.delete('/users/:userId/votes/:problemId', deleteUserVote);

// Problem management
router.get('/problems', getProblems);
router.delete('/problems/:problemId', deleteProblem);
router.patch('/problems/:problemId/status', updateProblemStatus);
router.get('/problems/search/:problemId', searchProblemById);

// Comment management
router.get('/comments', getComments);
router.delete('/comments/:commentId', deleteComment);

// Chat management
router.get('/chat', getChatMessages);
router.delete('/chat/:messageId', deleteChatMessage);

module.exports = router;
