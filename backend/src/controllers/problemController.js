const { v4: uuidv4 } = require("uuid");
const Problem = require("../models/Problem");
const { detectCategory, generateSolution, findSimilar, AUTHORITY_MAP } = require("../utils/problemAnalyzer");

// Generate unique problem ID
const generateProblemId = () => {
  const prefix = "PRB";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// GET all problems
const getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find().sort({ createdAt: -1 }).populate('userId', 'name email');
    
    // Convert ObjectIds to strings for frontend compatibility
    const serializedProblems = problems.map(problem => ({
      ...problem.toObject(),
      id: problem._id.toString(),
      userId: problem.userId ? problem.userId._id?.toString() || problem.userId.toString() : null,
      votedBy: problem.votedBy.map(id => id.toString())
    }));
    
    res.json(serializedProblems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching problems" });
  }
};

// GET single problem
const getProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).populate('userId', 'name email');
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    
    // Convert ObjectIds to strings for frontend compatibility
    const serializedProblem = {
      ...problem.toObject(),
      id: problem._id.toString(),
      userId: problem.userId ? problem.userId._id?.toString() || problem.userId.toString() : null,
      votedBy: problem.votedBy.map(id => id.toString())
    };
    
    res.json(serializedProblem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching problem" });
  }
};

// POST new problem
const createProblem = async (req, res) => {
  try {
    const { title, description, location } = req.body;
    if (!title || !description)
      return res.status(400).json({ error: "Title and description are required" });

    // Check for similar problems
    const existingProblems = await Problem.find();
    const similar = findSimilar(title + " " + description, existingProblems);
    if (similar) return res.json({ similar: true, existingProblem: similar });

    const cat = detectCategory(title + " " + description);
    
    // Generate unique problem ID
    const problemId = generateProblemId();
    
    const problem = new Problem({
      problemId: problemId,
      title: title.trim(),
      description: description.trim(),
      userName: req.user.name,
      userId: req.user.id,
      userAvatar: req.user.avatar,
      location: location ? JSON.parse(location) : null,
      image: req.file ? req.file.path : null, // Cloudinary URL
      category: cat,
      aiSolution: generateSolution(title + " " + description, cat),
      authority: AUTHORITY_MAP[cat],
      status: "Open",
      statusHistory: [{
        status: "Open",
        changedAt: new Date(),
        changedBy: req.user.id
      }],
      votes: 0,
      votedBy: [],
      comments: [],
    });
    await problem.save();
    
    // Return serialized problem with string IDs
    const serializedProblem = {
      ...problem.toObject(),
      id: problem._id.toString(),
      userId: problem.userId ? problem.userId.toString() : null,
      votedBy: problem.votedBy.map(id => id.toString())
    };
    
    res.json({ similar: false, problem: serializedProblem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST comment on problem
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Comment text required" });
    
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    
    const comment = {
      id: uuidv4(),
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatar,
      text: text.trim(),
      createdAt: new Date(),
    };
    problem.comments.push(comment);
    await problem.save();
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error adding comment" });
  }
};

// POST vote (once per user)
const voteProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    
    if (problem.votedBy.includes(req.user.id))
      return res.status(400).json({ error: "You already voted for this problem" });
    
    problem.votes += 1;
    problem.votedBy.push(req.user.id);
    await problem.save();
    res.json({ votes: problem.votes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error voting" });
  }
};

// PATCH status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    
    if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Check if the current user is the one who uploaded the problem
    if (problem.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: "Only the problem creator can update the status" });
    }
    
    // Validate status flow (can only move forward for users)
    const statusFlow = ['Open', 'In Progress', 'Resolved'];
    const currentStatusIndex = statusFlow.indexOf(problem.status);
    const newStatusIndex = statusFlow.indexOf(status);
    
    if (newStatusIndex < currentStatusIndex) {
      return res.status(400).json({ error: 'Cannot revert to previous status. Status flow: Open → In Progress → Resolved' });
    }
    
    if (newStatusIndex === currentStatusIndex) {
      return res.status(400).json({ error: 'Problem already has this status' });
    }
    
    // Update status and add to history
    problem.status = status;
    if (!problem.statusHistory) {
      problem.statusHistory = [];
    }
    problem.statusHistory.push({
      status: status,
      changedAt: new Date(),
      changedBy: req.user.id
    });
    
    await problem.save();
    res.json({ 
      status: problem.status,
      statusHistory: problem.statusHistory
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating status" });
  }
};

module.exports = { getAllProblems, getProblem, createProblem, addComment, voteProblem, updateStatus };
