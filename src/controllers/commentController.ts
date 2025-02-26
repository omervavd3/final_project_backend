import { Request, Response, NextFunction } from "express";
import CommentModel, { IComment } from "../models/commentsModel";
import BaseController from "./baseController";

const commentController = new BaseController(CommentModel);

export default commentController;