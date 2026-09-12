const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const sentimentController = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");

const validateSentiment = [
  body("update_id")
    .notEmpty()
    .withMessage("Update ID is required")
    .isString()
    .withMessage("Update ID must be a valid string"),
  body("text_content")
    .trim()
    .notEmpty()
    .withMessage("Text content is required")
    .isLength({ max: 5000 })
    .withMessage("Text content cannot exceed 5000 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(err => err.msg).join(", ")
      });
    }
    next();
  }
];

router.use(authMiddleware);

router.post("/analyze", validateSentiment, sentimentController.createSentiment);
router.get("/update/:updateId", sentimentController.getSentimentByUpdateId);
router.get("/", sentimentController.getAllSentiments);

module.exports = router;