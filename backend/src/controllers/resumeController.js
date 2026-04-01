const fs = require("fs/promises");
const path = require("path");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const pdfParse = require("pdf-parse");
const { evaluateResume } = require("../services/aiInterviewEngine");

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const getPublicBaseUrl = (req) => {
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto ? forwardedProto.split(",")[0].trim() : req.protocol;
  return `${protocol}://${req.get("host")}`;
};

const normalizeResumeUrl = (req, resumeUrl) => {
  if (!resumeUrl) {
    return resumeUrl;
  }

  const uploadsPrefix = "/uploads/";

  if (resumeUrl.startsWith(uploadsPrefix)) {
    return `${getPublicBaseUrl(req)}${resumeUrl}`;
  }

  try {
    const parsedUrl = new URL(resumeUrl);
    if (parsedUrl.host === req.get("host") && parsedUrl.pathname.startsWith(uploadsPrefix)) {
      parsedUrl.protocol = `${getPublicBaseUrl(req).split("://")[0]}:`;
      return parsedUrl.toString();
    }
  } catch {
    return resumeUrl;
  }

  return resumeUrl;
};

const saveResumeLocally = async ({ req, buffer, originalname, userId }) => {
  const uploadsDir = path.join(__dirname, "..", "..", "uploads", "resumes");
  await fs.mkdir(uploadsDir, { recursive: true });

  const safeName = originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${userId}_${Date.now()}_${safeName}`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    resumeUrl: `${getPublicBaseUrl(req)}/uploads/resumes/${fileName}`,
  };
};

const uploadToCloudinary = async ({ buffer, userId }) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "interviewiq/resumes",
        resource_type: "raw",
        format: "pdf",
        type: "upload",
        public_id: `${userId}_${Date.now()}`,
        overwrite: true,
        tags: ["resume"],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume file is required" });
    }

    const { buffer, originalname } = req.file;
    let evaluationReport = null;

    try {
      const pdfData = await pdfParse(buffer);
      evaluationReport = evaluateResume(pdfData.text, req.user.targetRole);
    } catch (parseError) {
      console.error("PDF Parse error", parseError);
    }

    const localResume = await saveResumeLocally({
      req,
      buffer,
      originalname,
      userId: req.user._id,
    });

    let cloudBackupUrl = null;
    if (hasCloudinaryConfig()) {
      try {
        const result = await uploadToCloudinary({ buffer, userId: req.user._id });
        cloudBackupUrl = result?.secure_url || null;
        req.user.resumePublicId = result?.public_id || req.user.resumePublicId;
      } catch (cloudError) {
        console.error("Cloudinary backup upload failed for resume:", cloudError.message);
      }
    }

    req.user.resumeUrl = localResume.resumeUrl;
    req.user.resumeUploadedAt = new Date();
    if (evaluationReport) req.user.resumeEvaluation = evaluationReport;
    await req.user.save({ validateBeforeSave: false });

    return res.status(200).json({
      message: "Resume uploaded successfully",
      resumeUrl: localResume.resumeUrl,
      cloudBackupUrl,
      evaluation: evaluationReport,
    });
  } catch (error) {
    next(error);
  }
};

const getResume = async (req, res, next) => {
  try {
    if (!req.user.resumeUrl) {
      return res.status(200).json({
        message: "No resume uploaded",
        resumeUrl: null,
        evaluation: null,
      });
    }

    const normalizedResumeUrl = normalizeResumeUrl(req, req.user.resumeUrl);
    if (normalizedResumeUrl !== req.user.resumeUrl) {
      req.user.resumeUrl = normalizedResumeUrl;
      await req.user.save({ validateBeforeSave: false });
    }

    res.status(200).json({ 
      resumeUrl: normalizedResumeUrl,
      evaluation: req.user.resumeEvaluation 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadResume,
  getResume,
};
