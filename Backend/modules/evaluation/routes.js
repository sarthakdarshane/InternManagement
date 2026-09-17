const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const evaluationController = require("./controller");
const authMiddleware = require("../../middleware/authMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");

const validateEvaluation = [
  body("intern_id")
    .notEmpty()
    .withMessage("Intern ID is required")
    .isString()
    .withMessage("Intern ID must be a valid string"),
  body("internship_id")
    .notEmpty()
    .withMessage("Internship ID is required")
    .isString()
    .withMessage("Internship ID must be a valid string"),
  body("evaluation_period")
    .trim()
    .notEmpty()
    .withMessage("Evaluation period is required")
    .isLength({ max: 100 })
    .withMessage("Evaluation period cannot exceed 100 characters"),
  body("communication")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Communication must be between 0 and 100"),
  body("technical_skill")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Technical skill must be between 0 and 100"),
  body("punctuality")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Punctuality must be between 0 and 100"),
  body("task_completion")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Task completion must be between 0 and 100"),
  body("teamwork")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Teamwork must be between 0 and 100"),
  body("comments")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Comments cannot exceed 2000 characters"),
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

const validateEvaluationUpdate = [
  body("communication")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Communication must be between 0 and 100"),
  body("technical_skill")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Technical skill must be between 0 and 100"),
  body("punctuality")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Punctuality must be between 0 and 100"),
  body("task_completion")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Task completion must be between 0 and 100"),
  body("teamwork")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Teamwork must be between 0 and 100"),
  body("comments")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Comments cannot exceed 2000 characters"),
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

// Evaluations are performed by MENTOR only (SUPERADMIN has no evaluation access).
router.post("/", roleMiddleware("MENTOR"), validateEvaluation, evaluationController.createEvaluation);
router.get("/", evaluationController.getAllEvaluations);
router.get("/pending", roleMiddleware("MENTOR"), evaluationController.getPendingEvaluations);
router.get("/my-evaluations", roleMiddleware("INTERN"), evaluationController.getMyEvaluations);
router.get("/performance/my-performance", roleMiddleware("INTERN"), evaluationController.getMyPerformance);
router.get("/performance/:internId", roleMiddleware("INTERN", "MENTOR", "ADMIN"), evaluationController.getPerformance);
router.get("/:id", evaluationController.getEvaluationById);
router.put("/:id", roleMiddleware("MENTOR"), validateEvaluationUpdate, evaluationController.updateEvaluation);
router.delete("/:id", roleMiddleware("MENTOR"), evaluationController.deleteEvaluation);

module.exports = router;