const User = require("../models/userModel");
const Interview = require("../models/interviewModel");

const ADMIN_ROLE = "admin";

function isSameUser(leftId, rightId) {
  return String(leftId || "") === String(rightId || "");
}

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
    const { role, isVerified, subscriptionTier, premiumInterviewsRemaining, premiumExpiresAt } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (role !== undefined) {
      const nextRole = String(role || "").trim().toLowerCase();

      if (targetUser.role === ADMIN_ROLE && nextRole !== ADMIN_ROLE) {
        if (isSameUser(req.user?._id, targetUser._id)) {
          return res.status(400).json({ message: "You cannot remove your own admin role." });
        }

        const adminCount = await User.countDocuments({ role: ADMIN_ROLE });
        if (adminCount <= 1) {
          return res.status(400).json({ message: "At least one admin account must remain active." });
        }
      }
    }

    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isVerified !== undefined) updates.isVerified = isVerified;
    if (subscriptionTier !== undefined) updates.subscriptionTier = subscriptionTier;
    if (premiumInterviewsRemaining !== undefined) updates.premiumInterviewsRemaining = premiumInterviewsRemaining;

    if (premiumExpiresAt !== undefined) {
      if (premiumExpiresAt === null || premiumExpiresAt === "") {
        updates.premiumExpiresAt = null;
      } else {
        const parsedPremiumExpiry = new Date(premiumExpiresAt);
        if (Number.isNaN(parsedPremiumExpiry.getTime())) {
          return res.status(400).json({ message: "Premium expiry date is invalid" });
        }
        updates.premiumExpiresAt = parsedPremiumExpiry;
      }
    }

    const user = await User.findByIdAndUpdate(targetUser._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (isSameUser(req.user?._id, user._id)) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    if (user.role === ADMIN_ROLE) {
      const adminCount = await User.countDocuments({ role: ADMIN_ROLE });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "You cannot delete the last remaining admin account." });
      }
    }

    const [deletedInterviews] = await Promise.all([
      Interview.deleteMany({ user: user._id }),
      User.findByIdAndDelete(user._id),
    ]);

    res.status(200).json({
      message: "User and related interviews deleted successfully",
      deletedInterviews: deletedInterviews.deletedCount || 0,
    });
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
