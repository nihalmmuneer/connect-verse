import { errorHandler } from "../utils/error.js";
import POST from "../models/post.model.js";

export const createPost = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(errorHandler(401, "User cannot create a post"));
  }
  if (!req.body.title || !req.body.content) {
    return next(errorHandler(401, "Please provide all required fields"));
  }
  const slug = req.body.title
    .split("")
    .join("")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9-]/g, "-");
  const newPost = new POST({
    ...req.body,
    slug,
    userId: req.user.id,
  });
  try {
    const savePost = await newPost.save();
    res.status(201).json(savePost);
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  try {
    // Parsing query parameter for Pagination,sorting and filtering

    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    // Querying the database to fetch posts based on the criteria
    const posts = await POST.find({
      ...(req.query.userId && { userId: req.query.userId }),
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.slug && { slug: req.query.slug }),
      ...(req.query.postId && { _id: req.query.postId }),
      ...(req.query.searchTerm && {
        $or: [
          { title: { $regex: req.query.searchTerm, $options: "i" } }, //$regex - used for searching the term 
          { content: { $regex: req.query.searchTerm, $options: "i" } }, // $options: i - Used for not bother if it is typed lowercase or uppercase
        ],
      }),
    })
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    // Counting total number of posts
    const totalPosts = await POST.countDocuments();

    // Counting number of posts created last month
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const lastMonthPosts = await POST.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    // Responding with fetched posts, total post counts, and last month post counts
    res.status(200).json({
      posts,
      totalPosts,
      lastMonthPosts,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  if (!req.user.isAdmin || req.user.id !== req.params.userId) {
    return next(errorHandler(401, "Post cannot be deleted"));
  }
  try {
    await POST.findByIdAndDelete(req.params.postId);
    res.status(200).json("the post is deleted");
  } catch (error) {
    console.log(error.message);
  }
};

export const updatePosts = async (req, res, next) => {
  if (!req.user.isAdmin || req.params.userId !== req.user.id) {
    return next(errorHandler(401, "Post Cannot be Edited"));
  }

  try {
    const update = await POST.findByIdAndUpdate(
      req.params.postId,
      {
        $set: {
          title: req.body.title,
          content: req.body.content,
          image: req.body.image,
          category: req.body.category,
        },
      },
      { new: true }
    );
    res.status(200).json(update);
  } catch (error) {
    next(error);
  }
};
