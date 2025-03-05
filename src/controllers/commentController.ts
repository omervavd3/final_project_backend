import { Request, Response } from "express";
import CommentModel from "../models/commentsModel";
import BaseController from "./baseController";

class CommentController extends BaseController<CommentController> {
    constructor() {
        super(CommentModel);
    }

    async getByUserId(req:Request, res:Response) {
        console.log("here")
        try {
            const userId = req.params.userId;
            const data = await CommentModel.find({ owner: userId });
            res.status(200).send(data);
        } catch (error) {
            res.status(500).send(error);
        }
    }

    async getByPostId(req:Request, res:Response) {
        try {
            const postId = req.body.postId;
            const data = await CommentModel.find({ postId: postId });
            res.status(200).send(data);
        } catch (error) {
            res.status(500).send(error);
        }
    }
}

export default new CommentController();