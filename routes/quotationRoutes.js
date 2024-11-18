const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation'); // เรียกใช้ Quotation Model

router.post('/', async (req, res) => {
    const { name, email, mobile, service, note } = req.body;

    const newQuotation = new Quotation({
        name,
        email,
        phone: mobile, // เปลี่ยนให้ตรงกับชื่อฟิลด์ในฐานข้อมูล
        details: note, // เปลี่ยนให้ตรงกับชื่อฟิลด์ในฐานข้อมูล
        service
    });

    try {
        // บันทึกข้อมูลลง MongoDB
        await newQuotation.save();
        console.log('Received Quotation:', { name, email, mobile, service, note });
        res.json({ message: 'Quotation request submitted successfully!' });
    } catch (err) {
        console.error('Error saving quotation:', err);
        res.status(500).json({ message: 'Error saving quotation' });
    }
});

// รับคำขอใบเสนอราคาทั้งหมด
router.get('/', async (req, res) => {
  try {
    const quotations = await Quotation.find(); // ค้นหาทุกใบเสนอราคาในฐานข้อมูล
    res.json(quotations); // ส่งกลับข้อมูลทั้งหมด
  } catch (err) {
    console.error('Error retrieving quotations:', err);
    res.status(500).json({ message: 'Error retrieving quotations' });
  }
});

// อัปเดตคำขอใบเสนอราคา
router.put('/:id', async (req, res) => {
  const { name, email, mobile, service, note } = req.body;

  try {
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id, // ใช้ ID จาก URL
      { name, email, phone: mobile, details: note, service },
      { new: true } // ส่งกลับข้อมูลที่ถูกอัปเดต
    );
    if (!updatedQuotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json(updatedQuotation); // ส่งข้อมูลที่อัปเดตกลับไป
  } catch (err) {
    console.error('Error updating quotation:', err);
    res.status(500).json({ message: 'Error updating quotation' });
  }
});

// ลบคำขอใบเสนอราคา
router.delete('/:id', async (req, res) => {
  try {
    const deletedQuotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!deletedQuotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) {
    console.error('Error deleting quotation:', err);
    res.status(500).json({ message: 'Error deleting quotation' });
  }
});

module.exports = router;
