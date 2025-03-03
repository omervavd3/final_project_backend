import express from "express";
import { uploadMiddleware, uploadFile } from "../controllers/multerController";

const multerRouter = express.Router();
multerRouter.post("/", uploadMiddleware, uploadFile);

export default multerRouter;
