const Post = require("../models/Post");

// ==============================
// CREATE POST
// ==============================
const createPost = async (req, res) => {
    try {
        const {
            title,
            slug,
            content,
            excerpt,
            coverImage,
            tags,
            status
        } = req.body;

        // Validate required fields
        if (!title || !slug || !content) {
            return res.status(400).json({
                success: false,
                message: "Title, slug and content are required"
            });
        }

        // Check if slug already exists
        const existingPost = await Post.findOne({ slug });

        if (existingPost) {
            return res.status(400).json({
                success: false,
                message: "A post with this slug already exists"
            });
        }

        // Create post
        const post = await Post.create({
            title,
            slug,
            content,
            excerpt: excerpt || "",
            coverImage: coverImage || "",
            tags: tags || [],
            status: status || "draft",
            author: req.user.id
        });

        res.status(201).json({
            success: true,
            message: "Post created successfully",
            post
        });
    } catch (error) {
        console.error("Create post error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ==============================
// GET ALL POSTS
// ==============================
const getPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("author", "name username email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: posts.length,
            posts
        });
    } catch (error) {
        console.error("Get posts error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    createPost,
    getPosts
};