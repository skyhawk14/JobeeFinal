const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updatePassword,
  updateUser,
  deleteUser,
  getAppliedJobs,
  getPublishedJobs,
  getUsers,
  deleteUserAdmin,
} = require("../controllers/userController");

const { isAuthenticatedUser, authorizeRoles } = require("../middlewares/auth");

// to make same middle used by all route we can write
// router.use(isAuthenticatedUser)

router.route("/me").get(isAuthenticatedUser, getUserProfile);
router.route("/me/update").put(isAuthenticatedUser, updateUser);
router.route("/me/delete").put(isAuthenticatedUser, deleteUser);
router
  .route("/jobs/applied")
  .get(isAuthenticatedUser, authorizeRoles("user"), getAppliedJobs);
router
  .route("/jobs/applied")
  .get(
    isAuthenticatedUser,
    authorizeRoles("employeer", "admin"),
    getPublishedJobs
  );
router.route("/password/update").put(isAuthenticatedUser, updatePassword);
//Admin only routes
router
  .route("/users")
  .get(isAuthenticatedUser, authorizeRoles("employeer"), getUsers);
router
  .route("/user/:id")
  .get(isAuthenticatedUser, authorizeRoles("admin"), deleteUserAdmin);
module.exports = router;
