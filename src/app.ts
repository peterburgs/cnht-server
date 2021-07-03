import { log } from "./utils";
import express, { Request, Response, NextFunction, Application } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import morgan from "morgan";
dotenv.config();
const port = 3001;
const app: Application = express();
const API_URL = process.env.API_URL;

// Connect to MySQL
import sequelize from "./database/connection";
global.sequelize = sequelize;
// Import Routes
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import courseRoutes from "./routes/courseRoutes";
import sectionRoutes from "./routes/sectionRoutes";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("Method=:method |URL= :url |Status= :status | :response-time ms\n")
);

// Prevent CORS errors
app.use(cors());
// Handle header

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "PUT, POST, PUT, DELETE, PATCH, GET"
    );
    return res.status(200).json({});
  }
  next();
});

// Define URL
app.get(`${API_URL}`, (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to cungnhauhoctoan.net",
  });
});
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sections", sectionRoutes);

// Handle 404 error
app.use((req: Request, res: Response, next: NextFunction) => {
  const error: NodeJS.ErrnoException = new Error("Page Not Found!");
  error.code = "404";
  next(error);
});

// Handle other error codes
app.use(
  (
    error: NodeJS.ErrnoException,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.status(Number(error.code) || 500);
    res.json({
      error: {
        message: error.message,
      },
    });
  }
);

app.listen(port, () => log(`Server is running on port ${port}`));
