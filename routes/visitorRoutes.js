// routes/visitorRoutes.js

import express from "express";
import Visitor from "../models/Visitor.js";

const router = express.Router();

router.post("/increment", async (req, res) => {
  let visitor = await Visitor.findOne();

  if (!visitor) {
    visitor = new Visitor({ count: 1 });
  } else {
    visitor.count += 1;
  }

  await visitor.save();
  res.json(visitor);
});

router.get("/count", async (req, res) => {
  const visitor = await Visitor.findOne();
  res.json({ count: visitor ? visitor.count : 0 });
});

export default router;
