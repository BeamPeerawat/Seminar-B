import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { Parser } from "json2csv";

const router = express.Router();

// GET /api/reports/sales (original, unchanged)
router.get("/sales", async (req, res) => {
  try {
    const { from, to } = req.query;

    const query = {
      createdAt: {
        $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
        $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
      },
    };

    const orders = await Order.find(query);

    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;

    const byStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const byPayment = orders.reduce((acc, order) => {
      acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + order.total;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      totalSales,
      totalOrders,
      byStatus,
      byPayment,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/products/top-selling (unchanged)
router.get("/products/top-selling", async (req, res) => {
  try {
    const { from, to } = req.query;

    const orders = await Order.find({
      createdAt: {
        $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
        $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
      },
    });

    const productSales = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.name,
            quantity: 0,
            total: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].total += item.price * item.quantity;
      });
    });

    const topSelling = Object.entries(productSales)
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        quantity: data.quantity,
        total: data.total,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const lowStock = await Product.find({ stock: { $lte: 10 } }).select("productId name stock");

    res.status(200).json({
      success: true,
      topSelling,
      lowStock,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/customers/top (unchanged)
router.get("/customers/top", async (req, res) => {
  try {
    const { from, to } = req.query;

    const orders = await Order.find({
      createdAt: {
        $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
        $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
      },
    });

    const customerSales = {};
    orders.forEach((order) => {
      if (!customerSales[order.userId]) {
        customerSales[order.userId] = {
          name: order.customer.name,
          orderCount: 0,
          totalSpent: 0,
        };
      }
      customerSales[order.userId].orderCount += 1;
      customerSales[order.userId].totalSpent += order.total;
    });

    const topCustomers = Object.entries(customerSales)
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        orderCount: data.orderCount,
        totalSpent: data.totalSpent,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const newCustomers = await Profile.countDocuments({
      createdAt: {
        $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
        $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
      },
    });

    res.status(200).json({
      success: true,
      topCustomers,
      newCustomers,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/export (unchanged)
router.get("/export", async (req, res) => {
  try {
    const { type, from, to } = req.query;

    let data = [];
    let fields = [];
    let filename = "";

    if (type === "sales") {
      const orders = await Order.find({
        createdAt: {
          $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
          $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
        },
      });
      data = orders.map((order) => ({
        orderNumber: order.orderNumber,
        date: order.createdAt.toISOString(),
        customer: order.customer.name,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
      }));
      fields = ["orderNumber", "date", "customer", "total", "status", "paymentMethod"];
      filename = "sales-report";
    } else if (type === "products") {
      const orders = await Order.find({
        createdAt: {
          $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
          $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
        },
      });
      const productSales = {};
      orders.forEach((order) => {
        order.items.forEach((item) => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              name: item.name,
              quantity: 0,
              total: 0,
            };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].total += item.price * item.quantity;
        });
      });
      data = Object.entries(productSales).map(([productId, data]) => ({
        productId,
        name: data.name,
        quantity: data.quantity,
        total: data.total,
      }));
      const lowStock = await Product.find({ stock: { $lte: 10 } }).select("productId name stock");
      data = [...data, ...lowStock.map((p) => ({ productId: p.productId, name: p.name, stock: p.stock }))];
      fields = ["productId", "name", "quantity", "total", "stock"];
      filename = "products-report";
    } else if (type === "customers") {
      const orders = await Order.find({
        createdAt: {
          $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
          $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
        },
      });
      const customerSales = {};
      orders.forEach((order) => {
        if (!customerSales[order.userId]) {
          customerSales[order.userId] = {
            name: order.customer.name,
            orderCount: 0,
            totalSpent: 0,
          };
        }
        customerSales[order.userId].orderCount += 1;
        customerSales[order.userId].totalSpent += order.total;
      });
      data = Object.entries(customerSales).map(([userId, data]) => ({
        userId,
        name: data.name,
        orderCount: data.orderCount,
        totalSpent: data.totalSpent,
      }));
      fields = ["userId", "name", "orderCount", "totalSpent"];
      filename = "customers-report";
    } else if (type === "orders") {
      data = await Order.find({
        createdAt: {
          $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
          $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
        },
      }).map((order) => ({
        orderNumber: order.orderNumber,
        date: order.createdAt.toISOString(),
        customer: order.customer.name,
        total: order.total,
        status: order.status,
      }));
      fields = ["orderNumber", "date", "customer", "total", "status"];
      filename = "orders-report";
    } else if (type === "stock") {
      data = await Product.find().select("productId name stock").map((p) => ({
        productId: p.productId,
        name: p.name,
        stock: p.stock,
      }));
      fields = ["productId", "name", "stock"];
      filename = "stock-report";
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header("Content-Type", "text/csv");
    res.attachment(`${filename}-${from}-to-${to}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint for exporting selected products
router.get("/export-selected-products", async (req, res) => {
  try {
    const { productIds, from, to } = req.query;
    const productIdList = productIds ? productIds.split(",") : [];

    if (productIdList.length === 0) {
      return res.status(400).json({ success: false, error: "No products selected" });
    }

    const query = {
      createdAt: {
        $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
        $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
      },
      "items.productId": { $in: productIdList },
    };

    const orders = await Order.find(query);

    // Extract relevant item data from orders
    const data = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (productIdList.includes(item.productId)) {
          data.push({
            orderNumber: order.orderNumber,
            date: order.createdAt.toISOString().split("T")[0],
            customerName: order.customer.name,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            status: order.status,
          });
        }
      });
    });

    const fields = [
      "orderNumber",
      "date",
      "customerName",
      "productName",
      "quantity",
      "price",
      "total",
      "status",
    ];
    const filename = "selected-products-report";

    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header("Content-Type", "text/csv");
    res.attachment(`${filename}-${from}-to-${to}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;