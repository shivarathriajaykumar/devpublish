const mongoose = require("mongoose");
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
        const posts = await Post.find({ status: "published" })
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

// ==============================
// GET SINGLE POST BY SLUG
// ==============================
const getPostBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        console.log("Requested slug:", slug);

        const post = await Post.findOne({
            slug,
            status: "published"
        }).populate("author", "name username email");

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Article not found"
            });
        }

        res.status(200).json({
            success: true,
            post
        });

    } catch (error) {
        console.error("Get post by slug error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ==============================
// UPDATE POST
// ==============================
const updatePost = async (req, res) => {
    try {
        const { id } = req.params;

        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Check ownership
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to edit this post"
            });
        }

        const {
            title,
            slug,
            content,
            excerpt,
            coverImage,
            tags,
            status
        } = req.body;

        // Update only provided fields
        if (title !== undefined) post.title = title;
        if (slug !== undefined) post.slug = slug;
        if (content !== undefined) post.content = content;
        if (excerpt !== undefined) post.excerpt = excerpt;
        if (coverImage !== undefined) post.coverImage = coverImage;
        if (tags !== undefined) post.tags = tags;
        if (status !== undefined) post.status = status;

        await post.save();

        res.status(200).json({
            success: true,
            message: "Post updated successfully",
            post
        });

    } catch (error) {
        console.error("Update post error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ==============================
// DELETE POST
// ==============================
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;

if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
        success: false,
        message: "Invalid post ID"
    });
}

const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        // Check ownership
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to delete this post"
            });
        }

        await post.deleteOne();

        res.status(200).json({
            success: true,
            message: "Post deleted successfully"
        });

    } catch (error) {
        console.error("Delete post error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ==============================
// GET MY POSTS
// ==============================
const getMyPosts = async (req, res) => {
    try {
        const posts = await Post.find({
            author: req.user.id
        })
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: posts.length,
            posts
        });

    } catch (error) {
        console.error("Get my posts error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    createPost,
    getPosts,
    getPostBySlug,
    updatePost,
    deletePost,
    getMyPosts
};