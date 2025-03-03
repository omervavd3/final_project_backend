import { Request, Response } from "express";
import multer from "multer";

const base = `http://${process.env.DOMAIN_BASE || "localhost"}:${
  process.env.PORT || 3000
}/`;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/"),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").filter(Boolean).slice(1).join(".");
    cb(null, Date.now() + "." + ext);
  },
});

const upload = multer({ storage });

export const uploadFile = (req: Request, res: Response) => {
  if (req.file == null) {
    res.status(400).send("No file uploaded");
    return;
  }
  const filePath = req.file.path.replace(/\\/g, "/").replace('public/', ''); 
  const fileUrl = `${base}${filePath}`;
  console.log("File uploaded: " + fileUrl);
  res.status(200).send({ url: fileUrl });
};

export const uploadMiddleware = upload.single("file");
