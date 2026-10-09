const express = require("express");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const Patient = require("../models/Patient");
const { auth, allowRoles } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { cloudinary, isConfigured } = require("../config/cloudinary");
const { createNotification } = require("../services/notificationService");

const router = express.Router();

// Helper: Upload buffer to Cloudinary using Promise wrapper
function uploadBufferToCloudinary(buffer, filename, mimetype) {
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === "application/pdf";
    const resource_type = isPdf ? "raw" : "image";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "carelume_documents",
        resource_type,
        public_id: `${Date.now()}-${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

// 1. Get documents (Staff sees all or filter by patient; Patients see only their own)
router.get("/", auth, async (req, res) => {
  try {
    const { patientId } = req.query;
    let filter = {};

    if (req.user.role === "patient") {
      filter = { patientId: req.user.patientId };
    } else if (patientId) {
      filter = { patientId: patientId.trim().toUpperCase() };
    }

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json(documents);
  } catch (error) {
    console.error("Document fetch failed:", error.message);
    return res.status(500).json({ message: "Could not load documents." });
  }
});

// 2. Upload a document (Patient uploads their own; Staff can upload for a patient)
router.post(
  "/upload",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!isConfigured) {
        return res.status(503).json({
          message:
            "Cloud storage service is currently not configured on the server. Please check Cloudinary settings in server .env.",
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Please select a file to upload." });
      }

      const { name, category = "General", documentId, targetPatientId } = req.body || {};

      // Determine patient ID safely
      let patientId;
      if (req.user.role === "patient") {
        patientId = req.user.patientId;
      } else {
        patientId = targetPatientId || req.body.patientId;
      }

      if (!patientId) {
        return res.status(400).json({ message: "Patient ID is required." });
      }

      const patientExists = await Patient.exists({ patientId });
      if (!patientExists) {
        return res.status(404).json({ message: "Patient record not found." });
      }

      const docName = name && name.trim() ? name.trim() : req.file.originalname;

      // Upload file to Cloudinary
      let cloudResult;
      try {
        cloudResult = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      } catch (uploadError) {
        console.error("Cloudinary upload failed:", uploadError.message);
        return res.status(502).json({
          message: "Failed to upload file to cloud storage. Please try again.",
        });
      }

      let document;
      // If updating an existing pending checklist item
      if (documentId && mongoose.isValidObjectId(documentId)) {
        document = await Document.findOne({
          _id: documentId,
          patientId,
        });

        if (document) {
          document.name = docName;
          document.category = category;
          document.status = "Submitted";
          document.fileUrl = cloudResult.secure_url;
          document.cloudinaryPublicId = cloudResult.public_id;
          document.resourceType = cloudResult.resource_type;
          document.mimeType = req.file.mimetype;
          document.fileSize = req.file.size;
          document.submittedAt = new Date();
          await document.save();
        }
      }

      if (!document) {
        document = await Document.create({
          patientId,
          name: docName,
          category,
          status: "Submitted",
          fileUrl: cloudResult.secure_url,
          cloudinaryPublicId: cloudResult.public_id,
          resourceType: cloudResult.resource_type,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          submittedAt: new Date(),
        });
      }

      // Notify staff
      await createNotification({
        recipientRole: "staff",
        type: "document",
        title: "New Document Submission",
        message: `Patient ${patientId} submitted document "${docName}" for review.`,
        link: `/staff/documents`,
      });

      // Notify patient
      await createNotification({
        recipientRole: "patient",
        patientId,
        type: "document",
        title: "Document Submitted",
        message: `Your document "${docName}" was uploaded successfully and is awaiting review.`,
        link: `/patient/documents`,
      });

      return res.status(201).json({
        message: "Document uploaded successfully.",
        document,
      });
    } catch (error) {
      console.error("Document upload handler failed:", error.message);
      return res.status(500).json({ message: "Could not upload document." });
    }
  }
);

// 3. Create document requirement checklist item (Staff only)
router.post("/", auth, allowRoles("staff"), async (req, res) => {
  try {
    const { patientId, name, category = "General" } = req.body || {};

    if (!patientId || !name) {
      return res.status(400).json({
        message: "Patient ID and document name are required.",
      });
    }

    const patientExists = await Patient.exists({ patientId: patientId.trim().toUpperCase() });
    if (!patientExists) {
      return res.status(404).json({ message: "Patient not found." });
    }

    const document = await Document.create({
      patientId: patientId.trim().toUpperCase(),
      name: name.trim(),
      category: category.trim(),
      status: "Pending",
    });

    // Notify patient
    await createNotification({
      recipientRole: "patient",
      patientId: patientId.trim().toUpperCase(),
      type: "document",
      title: "Document Requested",
      message: `The clinic requested a new document: "${name.trim()}". Please upload it in your Documents section.`,
      link: `/patient/documents`,
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error("Create document requirement failed:", error.message);
    return res.status(500).json({ message: "Could not create document item." });
  }
});

// 4. Secure view / download URL for a document
router.get("/:id/secure-view", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid document ID." });
    }

    const document = await Document.findById(req.params.id).lean();
    if (!document) {
      return res.status(404).json({ message: "Document not found." });
    }

    // Ownership check for patients
    if (
      req.user.role === "patient" &&
      document.patientId !== req.user.patientId
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (!document.fileUrl) {
      return res.status(404).json({
        message: "This document has not been uploaded yet.",
      });
    }

    return res.json({
      url: document.fileUrl,
      name: document.name,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
    });
  } catch (error) {
    console.error("Secure document view failed:", error.message);
    return res.status(500).json({ message: "Could not access document." });
  }
});

// 5. Update document status & review notes (Staff only)
router.patch(
  "/:id/status",
  auth,
  allowRoles("staff"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid document ID.",
        });
      }

      const allowedStatuses = ["Pending", "Submitted", "Approved", "Rejected"];

      if (
        typeof req.body?.status !== "string" ||
        !allowedStatuses.includes(req.body.status)
      ) {
        return res.status(400).json({
          message: "Invalid document status. Allowed: Pending, Submitted, Approved, Rejected.",
        });
      }

      const updateData = {
        status: req.body.status,
        reviewedBy: req.user.name,
        reviewedAt: new Date(),
      };

      if (req.body.reviewNotes) {
        updateData.reviewNotes = req.body.reviewNotes.trim();
      }

      const document = await Document.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!document) {
        return res.status(404).json({
          message: "Document not found.",
        });
      }

      // Notify patient of status change
      await createNotification({
        recipientRole: "patient",
        patientId: document.patientId,
        type: "document",
        title: `Document ${document.status}`,
        message: `Your document "${document.name}" was marked as ${document.status} by clinic staff.${
          req.body.reviewNotes ? ` Note: ${req.body.reviewNotes}` : ""
        }`,
        link: `/patient/documents`,
      });

      return res.json(document);
    } catch (error) {
      console.error("Document update failed:", error.message);
      return res.status(500).json({
        message: "Could not update document.",
      });
    }
  }
);

module.exports = router;
