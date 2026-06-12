import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

export const validateRegister = [
  body("idToken")
    .notEmpty()
    .withMessage("Firebase ID token is required"),
  body("role")
    .optional()
    .isIn(["citizen", "operator", "supervisor", "admin"])
    .withMessage("Invalid user role"),
  handleValidationErrors
];

export const validateLogin = [
  body("idToken")
    .notEmpty()
    .withMessage("Firebase ID token is required"),
  handleValidationErrors
];

export const validateIssueUpload = [
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a valid number between -90 and 90"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a valid number between -180 and 180"),
  body("issueType")
    .isIn(["pothole", "sewer", "garbage", "construction", "infrastructure_damage", "public_safety_hazard", "other"])
    .withMessage("Issue type must be one of: pothole, sewer, garbage, construction, infrastructure_damage, public_safety_hazard, other"),
  body("severity")
    .isIn(["Low", "Medium", "High", "Critical"])
    .withMessage("Severity must be one of: Low, Medium, High, Critical"),
  body("affectedArea")
    .isIn(["Road", "School Zone", "Hospital Zone", "Market Area", "Residential Area", "Government Facility", "Public Utility", "Other"])
    .withMessage("Affected Area must be one of: Road, School Zone, Hospital Zone, Market Area, Residential Area, Government Facility, Public Utility, Other"),
  body("customIssueType")
    .if(body("issueType").equals("other"))
    .trim()
    .notEmpty()
    .withMessage("Custom issue type description is required when other is selected"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters long"),
  body("photos")
    .optional()
    .isArray()
    .withMessage("Photos must be an array of image strings"),
  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string"),
  handleValidationErrors
];

export const validateBulkUpdate = [
  body("ids")
    .isArray({ min: 1 })
    .withMessage("ids must be a non-empty array of issue IDs"),
  body("ids.*")
    .isMongoId()
    .withMessage("Each ID must be a valid MongoDB ID"),
  body("action")
    .isIn(["resolved", "in-progress", "recalculate"])
    .withMessage("Action must be one of: resolved, in-progress, recalculate"),
  body("weather")
    .optional()
    .isString()
    .withMessage("Weather must be a string"),
  handleValidationErrors
];

export const validateIntervention = [
  body("ids")
    .isArray()
    .withMessage("ids must be an array of issue IDs"),
  body("ids.*")
    .isMongoId()
    .withMessage("Each ID must be a valid MongoDB ID"),
  body("weather")
    .optional()
    .isString()
    .withMessage("Weather must be a string"),
  handleValidationErrors
];
