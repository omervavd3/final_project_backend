import { Request, Response, NextFunction } from "express";
import LikesModel from "../models/likesModel";
import CommentModel from "../models/commentsModel";
import PostModel from "../models/postModel";
import UserModel from "../models/userModel";
import bcrypt from "bcrypt";

export const commentDeleteMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const commentId = req.params.id;
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      res.status(404).send("Comment not found");
      return;
    }
    const post = await PostModel.findById(comment.postId);
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }
    if (post.owner !== userId && comment.owner !== userId) {
      res.status(403).send("Unauthorized");
      return;
    }
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};

export const commentEditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const userName = req.params.userName;
    const commentId = req.params.id;
    const comment = await CommentModel.findById({ _id: commentId });
    if (!comment) {
      res.status(404).send("Comment not found");
      return;
    }
    if (comment.owner !== userId) {
      res.status(403).send("Unauthorized");
      return;
    }
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};

export const postMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const userName = req.params.userName;
    const postId = req.params.id;
    const post = await PostModel.findById(postId);
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }
    if (post.owner !== userId) {
      res.status(403).send("Unauthorized");
      return;
    }
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};

export const postDeleteMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const postId = req.params.id;
    const comments = await CommentModel.find({ postId: postId });
    if (comments.length > 0) {
      await CommentModel.deleteMany({ postId: postId });
    }
    const likes = await LikesModel.find({ postId: postId });
    if (likes.length > 0) {
      await LikesModel.deleteMany({
        postId: postId,
      });
    }
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};

export const authUpdateMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const userName = req.params.userName;
    const oldPassword = req.body.oldPassword;
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).send("User not found");
      return;
    }
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      res.status(402).send("Invalid password");
      return;
    }
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};

export const commentsPostMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const postId = req.body.postId;
    const post = await PostModel.findById(postId);
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};

export const likesMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const value = req.body.value;
    const postId = req.body.postId;
    if (value !== 1 && value !== -1) {
      res.status(400).send("Invalid value");
      return;
    }
    const post = await PostModel.findById(postId);
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }
    post.likes += value;
    await post.save();
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};
