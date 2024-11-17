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

module.exports = router;
