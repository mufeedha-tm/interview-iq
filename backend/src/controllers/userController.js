const User = require("../models/userModel");
const Interview = require("../models/interviewModel");

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limitNumber).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      users,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const [totalInterviews, completedInterviews, averageScoreResult, latestInterview] = await Promise.all([
      Interview.countDocuments({ user: userId }),
      Interview.countDocuments({ user: userId, status: "completed" }),
      Interview.aggregate([
        { $match: { user: user._id, "results.score": { $exists: true } } },
        { $group: { _id: null, averageScore: { $avg: "$results.score" } } },
      ]),
      Interview.findOne({ user: userId })
        .sort({ updatedAt: -1 })
        .select("title status difficulty skills results.score updatedAt"),
    ]);

    res.status(200).json({
      user,
      stats: {
        totalInterviews,
        completedInterviews,
        averageScore: averageScoreResult.length
          ? Math.round(averageScoreResult[0].averageScore * 100) / 100
          : 0,
        latestInterview,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { role, isVerified, subscriptionTier, premiumInterviewsRemaining } = req.body;
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isVerified !== undefined) updates.isVerified = isVerified;
    if (subscriptionTier !== undefined) updates.subscriptionTier = subscriptionTier;
    if (premiumInterviewsRemaining !== undefined) updates.premiumInterviewsRemaining = premiumInterviewsRemaining;

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
