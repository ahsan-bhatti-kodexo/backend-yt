import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config();
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;
    console.log("Database connected successfully");

    app.on("error", (error) => {
      console.error("Error starting server:", error);
      throw error;
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });
