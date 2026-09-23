const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
    registerUser,
    getUsers,
    loginUser,
    forgotPassword,
    resetPassword

} = require("../controllers/userController");

const router = express.Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

// Get all users
router.get("/", getUsers);

// Protected test route
router.get("/profile", protect, (req, res) => {
    res.status(200).json({
        success: true,
        message: "You are authorized ✅",
        user: req.user
    });
});

module.exports = router;