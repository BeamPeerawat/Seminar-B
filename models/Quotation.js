import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  details: { type: String, required: true },
  service: { type: String, required: true }
});

const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;
