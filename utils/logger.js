// import winston from "winston";
// import dotenv from "dotenv";

// dotenv.config();

// const logger = winston.createLogger({
//   level: process.env.NODE_ENV === "production" ? "info" : "debug",
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.printf(({ timestamp, level, message }) => {
//       return `${timestamp} [${level.toUpperCase()}]: ${message}`;
//     })
//   ),
//   transports: [
//     new winston.transports.Console(),
//     new winston.transports.File({
//       filename: process.env.LOG_ERROR_FILE || "logs/error.log",
//       level: "error",
//     }),
//     new winston.transports.File({
//       filename: process.env.LOG_COMBINED_FILE || "logs/combined.log",
//     }),
//   ],
//   exceptionHandlers: [
//     new winston.transports.File({
//       filename: process.env.LOG_EXCEPTIONS_FILE || "logs/exceptions.log",
//     }),
//   ],
//   rejectionHandlers: [
//     new winston.transports.File({
//       filename: process.env.LOG_REJECTIONS_FILE || "logs/rejections.log",
//     }),
//   ],
// });

// export default logger;

const logger = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  error: (...args) => console.error(...args),
};

export default logger;