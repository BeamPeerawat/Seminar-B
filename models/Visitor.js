// models/Visitor.js

import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
});

const Visitor = mongoose.model("Visitor", visitorSchema);

export default Visitor;
