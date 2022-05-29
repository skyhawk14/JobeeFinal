const express = require("express");
const router = express.Router();

//importing jobs controller
const {
  getJobs,
  newJob,
  getJobsInRadius,
  updateJob,
  deleteJob,
  getJob,
  jobStats,
  applyJob,
} = require("../controllers/jobsController");

const { isAuthenticatedUser, authorizeRoles } = require("../middlewares/auth");

router.route("/jobs").get(getJobs);
router.route("/job/:id/:slug").get(getJob);
router
  .route("/job/new")
  .post(isAuthenticatedUser, authorizeRoles("employeer", "admin"), newJob);
router.route("/stats/:topic").get(jobStats);
router.route("/jobs/:zipcode/:distance").get(getJobsInRadius);
router
  .route("/job/:id")
  .put(isAuthenticatedUser, updateJob)
  .delete(isAuthenticatedUser, deleteJob);
router
  .route("/job/:id/apply")
  .put(isAuthenticatedUser, authorizeRoles("user"), applyJob);
module.exports = router;
