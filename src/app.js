import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

const maxLimit = "16kb";

app.use(express.json({ limit: maxLimit }));
app.use(express.urlencoded({ extended: true, limit: maxLimit }));
app.use(express.static("public"));
app.use(cookieParser());

export { app };
