import UserModel from "../models/userModel";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const register = async (req: Request, res: Response) => {
    try {
        const {email, password, userName} = req.body;
        if(email == null || password == null || userName == null) {
            res.status(404).send("Email, password and name are required");
            return;
        }
        const user = await UserModel.findOne({email});
        if(user) {
            res.status(400).send("User already exists");
            return;
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await UserModel.create({email, password:hashedPassword, userName});
        res.status(201).send(newUser);
        return;
    } catch (error) {
        res.status(500).send(error);
    }
};

const login = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;
        if(email == null || password == null) {
            res.status(404).send("Email and password are required");
            return;
        }
        const user = await UserModel.findOne({email});
        if(user == null) {
            res.status(400).send("User does not exist");
            return;
        }
        const valid = await bcrypt.compare(password, user.password);
        if(!valid) {
            res.status(402).send("Invalid password");
            return;
        }
        if(process.env.ACCESS_TOKEN_SECRET == null || process.env.JWT_ACCESS_EXPIRES_IN == null || process.env.REFRESH_TOKEN_SECRET == null) {
            res.status(500).send("Internal server error");
            return;
        }
        if(process.env.REFRESH_TOKEN_SECRET == null) {
            res.status(500).send("Internal server error");
            return;
        }
        const random = Math.random().toString();
        const accessToken = await jwt.sign(
            {   
                '_id': user._id,
                'userName': user.userName,
                'random': random
            }, 
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: process.env.JWT_ACCESS_EXPIRES_IN}
        );
        const refreshToken = await jwt.sign(
            {
                '_id': user._id,
                'userName': user.userName,
                'random': random
            }, 
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: process.env.JWT_REFRESH_EXPIRES_IN}
        )
        if(user.tokens == null) {
            user.tokens = [];
        }
        res.cookie("refreshToken", refreshToken, {
            httpOnly: false,
            sameSite: "none",
            secure: process.env.NODE_ENV === "production", 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.cookie("accessToken", accessToken, {
            httpOnly: false,
            sameSite: "none",
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 1000 
        });
        user.tokens.push(refreshToken);
        await user.save();
        res.status(200).send({accessToken: accessToken, refreshToken: refreshToken});
    } catch (error) {
        res.status(500).send(error);
    }
};

const logout = async (req: Request, res: Response) => {
    try {
        const authToken = req.headers['authorization'];
        const refreshToken = authToken && authToken.split(' ')[1];
        if(refreshToken == null) {
            res.status(401).send("Unauthorized, no token");
            return;
        }
        if(process.env.REFRESH_TOKEN_SECRET == null) {
            res.status(500).send("Internal server error");
            return;
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err: jwt.VerifyErrors | null, payload:any) => {
            if(err) {
                res.status(403).send("Token verification failed");
                return;
            }
            const user = await UserModel.findById((payload as payload)._id);
            if(user == null) {
                res.status(404).send("User is null");
                return;
            }
            if(!user.tokens.includes(refreshToken)) {
                user.tokens = [];
                await user.save();
                res.status(403).send("No matching token");
                return;
            }
            user.tokens = user.tokens.filter((token) => token !== refreshToken);
            await user.save();
            res.status(200).send("Logged out");
        })
    } catch (error) {
        res.status(500).send(error);
    }
}

const updateUser = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        const user = await UserModel.findById(userId);
        if(user == null) {
            res.status(404).send("User not found");
            return;
        }
        const {email, newPassword} = req.body;
        if(!email || !newPassword) {
            res.status(404).send("Email and password are required");
            return;
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.email = email;
        user.password = hashedPassword;
        await user.save();
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
}

type payload = {
    _id: string,
    userName: string
}

const autMiddleware = async (req: Request, res: Response, next: any) => {
    const authHeaders = req.headers['authorization'];
    const token = authHeaders && authHeaders.split(' ')[1];
    if(token == null) {
        res.status(401).send("No token provided");
        return;
    }

    if(process.env.ACCESS_TOKEN_SECRET == null) {
        res.status(500).send("No token secret");
        return;
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if(err) {
            res.status(403).send("Error in middleware");
            return;
        }
        req.params.userId = (payload as payload)._id;
        req.params.userName = (payload as payload).userName;
        next();
    })
}

const refreshToken = async (req: Request, res: Response) => {
    const authToken = req.headers['authorization'];
    const refreshToken = authToken && authToken.split(' ')[1];
    if(refreshToken == null) {
        res.status(401).send("Unauthorized");
        return;
    }
    try {
        if(process.env.REFRESH_TOKEN_SECRET == null) {
            res.status(500).send("Internal server error");
            return;
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err: jwt.VerifyErrors | null, payload:any) => {
            if(err) {
                res.status(403).send("Wrong refresh token");
                return;
            }
            const user = await UserModel.findById((payload as payload)._id);
            if(user == null) {
                res.status(404).send("No user found");
                return;
            }
            if(!user.tokens.includes(refreshToken)) {
                user.tokens = []
                await user.save();
                res.status(404).send("No mathcing token");
                return;
            }
            if(process.env.ACCESS_TOKEN_SECRET == null || process.env.JWT_ACCESS_EXPIRES_IN == null || process.env.JWT_REFRESH_EXPIERS_IN == null || process.env.REFRESH_TOKEN_SECRET == null) {
                res.status(500).send("Internal server error");
                return;
            }
            const random = Math.random().toString();
            const accesToken = await jwt.sign(
                {
                    '_id': user._id,
                    'userName': user.userName,
                    'random': random
                }, 
                process.env.ACCESS_TOKEN_SECRET,
                {expiresIn: process.env.JWT_ACCESS_EXPIRES_IN}
            )
            const newRefreshToken = await jwt.sign(
                {
                    '_id': user._id,
                    'userName': user.userName,
                    'random': random
                }, 
                process.env.REFRESH_TOKEN_SECRET,
                {expiresIn: process.env.JWT_REFRESH_EXPIRES_IN}
            )
            user.tokens.push(newRefreshToken);
            await user.save();
            res.status(200).send({accessToken: accesToken, refreshToken: newRefreshToken});
        })
    } catch (error) {
        res.status(500).send(error);
    }
}

export default {
    register,
    login,
    updateUser,
    logout,
    autMiddleware,
    refreshToken
};