const mongoose = require("mongoose");
const { mongoUri } = require("./env");

const connectDB = async () => {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  mongoose.set("strictQuery", true);

  const options = {
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 10,
  };

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(mongoUri, options);

  console.log(`✅ Connected to MongoDB (${mongoose.connection.name})`);
};

module.exports = connectDB;
