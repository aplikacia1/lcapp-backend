const express = require("express");
const Order = require("../models/order");

const router = express.Router();

// 🟢 VYTVORIŤ NOVÚ OBJEDNÁVKU
router.post("/", async (req, res) => {
  try {
    const { items, customerEmail, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Objednávka musí obsahovať položky." });
    }

    const newOrder = new Order({
      items,
      customerEmail,
      note,
    });

    await newOrder.save();
    res.status(201).json({ message: "✅ Objednávka bola odoslaná." });
  } catch (error) {
    console.error("❌ Chyba pri odoslaní objednávky:", error);
    res.status(500).json({ message: "Chyba pri vytváraní objednávky." });
  }
});

// 🟡 ZÍSKAŤ VŠETKY OBJEDNÁVKY (pre admina)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("❌ Chyba pri načítaní objednávok:", error);
    res.status(500).json({ message: "Nepodarilo sa načítať objednávky." });
  }
});

// 🟠 ZMENIŤ STAV OBJEDNÁVKY
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["new", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Neplatný stav." });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Objednávka sa nenašla." });
    }

    res.json({ message: "✅ Stav objednávky bol aktualizovaný.", updatedOrder });
  } catch (error) {
    console.error("❌ Chyba pri aktualizácii stavu:", error);
    res.status(500).json({ message: "Nepodarilo sa zmeniť stav." });
  }
});

module.exports = router;
