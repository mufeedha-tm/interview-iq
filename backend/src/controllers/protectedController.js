const getSecret = (req, res) => {
  res.json({
    message: "This is a protected route.",
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

module.exports = { getSecret };
