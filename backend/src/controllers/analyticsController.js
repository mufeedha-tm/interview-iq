const Interview = require("../models/interviewModel");

const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin";

    const matchStage = isAdmin ? {} : { user: userId };

    const totalInterviews = await Interview.countDocuments(matchStage);

    const avgScoreResult = await Interview.aggregate([
      { $match: { ...matchStage, "results.score": { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: "$results.score" } } },
    ]);
    const averageScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore * 100) / 100 : 0;

    const monthlyCount = await Interview.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
      { $limit: 12 },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: {
                  if: { $lt: ["$_id.month", 10] },
                  then: { $concat: ["0", { $toString: "$_id.month" }] },
                  else: { $toString: "$_id.month" },
                },
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    const topSkills = await Interview.aggregate([
      { $match: matchStage },
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, skill: "$_id", count: 1 } },
    ]);

    res.status(200).json({
      totalInterviews,
      averageScore,
      monthlyInterviewCount: monthlyCount,
      topSkills,
    });
  } catch (error) {
    next(error);
  }
};

const getInterviewUserReport = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access joined interview reports" });
    }

    const report = await Interview.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 1,
          title: 1,
          status: 1,
          difficulty: 1,
          skills: 1,
          "results.score": 1,
          "results.feedback": 1,
          "results.strengths": 1,
          "results.improvements": 1,
          "results.coachingTips": 1,
          createdAt: 1,
          user: {
            id: "$userInfo._id",
            email: "$userInfo.email",
            role: "$userInfo.role",
            firstName: "$userInfo.firstName",
            lastName: "$userInfo.lastName",
            subscriptionTier: "$userInfo.subscriptionTier",
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const { filter, sortBy = 'averageScore' } = req.query;

    const matchQuery = { "results.score": { $exists: true } };

    if (filter === 'weekly') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      matchQuery.updatedAt = { $gte: lastWeek };
    } else if (filter === 'monthly') {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      matchQuery.updatedAt = { $gte: lastMonth };
    }

    const sortConfig = {};
    if (sortBy === 'totalInterviews') {
      sortConfig.interviewsCompleted = -1;
      sortConfig.averageScore = -1;
    } else {
      sortConfig.averageScore = -1;
      sortConfig.interviewsCompleted = -1;
    }
    sortConfig.bestScore = -1;

    const leaderboard = await Interview.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$user",
          interviewsCompleted: { $sum: 1 },
          averageScore: { $avg: "$results.score" },
          bestScore: { $max: "$results.score" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 0,
          userId: "$userInfo._id",
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$userInfo.firstName", ""] },
                  " ",
                  { $ifNull: ["$userInfo.lastName", ""] },
                ],
              },
            },
          },
          email: "$userInfo.email",
          averageScore: { $round: ["$averageScore", 2] },
          bestScore: 1,
          interviewsCompleted: 1,
        },
      },
      { $sort: sortConfig },
      { $limit: 100 },
    ]);

    res.status(200).json({ leaderboard });
  } catch (error) {
    next(error);
  }
};

const User = require("../models/userModel");

const getAdminDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access dashboard" });
    }

    // Total users count
    const totalUsers = await User.countDocuments();

    // Total verified users
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    // Subscription breakdown
    const subscriptionBreakdown = await User.aggregate([
      {
        $group: {
          _id: "$subscriptionTier",
          count: { $sum: 1 },
        },
      },
    ]);

    // Total interviews
    const totalInterviews = await Interview.countDocuments();

    // Completed interviews
    const completedInterviews = await Interview.countDocuments({ status: "completed" });

    // Active users (at least 1 interview in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await Interview.distinct("user", {
      createdAt: { $gte: sevenDaysAgo },
    });

    // New signups (last 7 days)
    const newSignups = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // New signups by day (last 7 days)
    const signupsByDay = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Average interview score
    const avgScoreResult = await Interview.aggregate([
      { $match: { "results.score": { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: "$results.score" } } },
    ]);
    const averageScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore * 100) / 100 : 0;

    // Most popular skills
    const topSkills = await Interview.aggregate([
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, skill: "$_id", count: 1 } },
    ]);

    // Top performing users
    const topUsers = await Interview.aggregate([
      { $match: { "results.score": { $exists: true } } },
      {
        $group: {
          _id: "$user",
          avgScore: { $avg: "$results.score" },
          totalInterviews: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          userId: "$userInfo._id",
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$userInfo.firstName", ""] },
                  " ",
                  { $ifNull: ["$userInfo.lastName", ""] },
                ],
              },
            },
          },
          email: "$userInfo.email",
          avgScore: { $round: ["$avgScore", 2] },
          totalInterviews: 1,
        },
      },
      { $sort: { avgScore: -1 } },
      { $limit: 5 },
    ]);

    // Interviews by difficulty
    const interviewsByDifficulty = await Interview.aggregate([
      {
        $group: {
          _id: "$difficulty",
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly interviews trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyInterviews = await Interview.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: {
                  if: { $lt: ["$_id.month", 10] },
                  then: { $concat: ["0", { $toString: "$_id.month" }] },
                  else: { $toString: "$_id.month" },
                },
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    res.status(200).json({
      totalUsers,
      verifiedUsers,
      totalInterviews,
      completedInterviews,
      activeUsers: activeUsers.length,
      newSignups,
      averageScore,
      subscriptionBreakdown,
      topSkills,
      topUsers,
      interviewsByDifficulty,
      signupsByDay,
      monthlyInterviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  getInterviewUserReport,
  getLeaderboard,
  getAdminDashboard,
};
