import { auth, OAuth2Client } from "google-auth-library";
import express, { Request, Response, NextFunction } from "express";
import User from "../models/user";
const client = new OAuth2Client(process.env.CLIENT_ID);
import { log } from "../utils";

// Verify token
const googleAuth = async (token: string) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID!,
  });
  return ticket.getPayload();
};

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;
  if (!authorization) {
    log("Authentication failed");
    return res.status(401).json({
      message: log("Authentication failed"),
    });
  }
  const token: string = authorization.split(" ")[1];
  try {
    const user = await googleAuth(token);
    req.body.decodedUser = user;
    req.headers.authorization = token;
    log("Authentication passed");
    next();
  } catch (error) {
    const errorMessage: string = error.message.split(",")[0];
    log(errorMessage);
    return res.status(401).json({
      message: log("Authentication failed"),
    });
  }
};
export default requireAuth;
