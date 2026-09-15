const express = require("express");

const {
    createPost,
    getPosts
} = require("../controllers/postController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new post - protected
router.post("/", protect, createPost);

// Get all posts - public
router.get("/", getPosts);

module.exports = router;