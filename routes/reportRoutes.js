import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { Parser } from "json2csv";

const router = express.Router();

// GET /api/reports/sales
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

    const dailyData = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = { sales: 0, orders: 0 };
      }
      dailyData[date].sales += order.total;
      dailyData[date].orders += 1;
    });

    const dailySales = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      success: true,
      totalSales,
      totalOrders,
      byStatus,
      byPayment,
      dailySales,
    });
  } catch (error) {
    console.error("Sales report error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/products/top-selling
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
            productId: item.productId,
            name: item.name,
            quantitySold: 0,
            totalSales: 0,
          };
        }
        productSales[item.productId].quantitySold += item.quantity;
        productSales[item.productId].totalSales += item.price * item.quantity;
      });
    });

    const topSelling = Object.values(productSales).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

    const lowStock = await Product.find({ stock: { $lte: 10 } }).select("productId name stock");

    res.status(200).json({
      success: true,
      topSelling,
      lowStock,
    });
  } catch (error) {
    console.error("Product report error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/customers/top
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
      const customerId = order.userId;
      if (!customerSales[customerId]) {
        customerSales[customerId] = {
          userId: customerId,
          name: order.customer.name,
          orderCount: 0,
          totalSpent: 0,
        };
      }
      customerSales[customerId].orderCount += 1;
      customerSales[customerId].totalSpent += order.total;
    });

    const topCustomers = Object.values(customerSales).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

    const newCustomers = await User.countDocuments({
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
    console.error("Customer report error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/export
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
        date: order.createdAt.toISOString().split("T")[0],
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
              productId: item.productId,
              name: item.name,
              quantitySold: 0,
              totalSales: 0,
            };
          }
          productSales[item.productId].quantitySold += item.quantity;
          productSales[item.productId].totalSales += item.price * item.quantity;
        });
      });

      data = Object.values(productSales);
      fields = ["productId", "name", "quantitySold", "totalSales"];
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
        const customerId = order.userId;
        if (!customerSales[customerId]) {
          customerSales[customerId] = {
            userId: customerId,
            name: order.customer.name,
            orderCount: 0,
            totalSpent: 0,
          };
        }
        customerSales[customerId].orderCount += 1;
        customerSales[customerId].totalSpent += order.total;
      });

      data = Object.values(customerSales);
      fields = ["userId", "name", "orderCount", "totalSpent"];
      filename = "customers-report";
    } else if (type === "stock") {
      data = await Product.find().select("productId name stock").lean();
      fields = ["productId", "name", "stock"];
      filename = "stock-report";
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header("Content-Type", "text/csv");
    res.attachment(`${filename}-${from}-to-${to}.csv`);
    res.send(csv);
  } catch (error) {
    console.error("Export error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/export-products-sales (New endpoint for selected products)
router.get("/export-products-sales", async (req, res) => {
  try {
    const { from, to, productIds } = req.query;
    if (!productIds) {
      return res.status(400).json({ success: false, error: "No product IDs provided" });
    }

    const productIdArray = productIds.split(",").map((id) => id.trim());
    const query = {
      createdAt: {
        $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0)),
        $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)),
      },
    };

    const orders = await Order.find(query).lean();
    const productDetails = await Product.find({ productId: { $in: productIdArray } })
      .select("productId name")
      .lean();

    const productMap = {};
    productDetails.forEach((product) => {
      productMap[product.productId.toString()] = product.name;
    });

    const data = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (productIdArray.includes(item.productId.toString())) {
          data.push({
            orderNumber: order.orderNumber,
            date: order.createdAt.toISOString().split("T")[0],
            productId: item.productId,
            productName: productMap[item.productId] || item.name,
            quantity: item.quantity,
            total: item.price * item.quantity,
            customer: order.customer.name,
            status: order.status,
            paymentMethod: order.paymentMethod,
          });
        }
      });
    });

    const fields = [
      "orderNumber",
      "date",
      "productId",
      "productName",
      "quantity",
      "total",
      "customer",
      "status",
      "paymentMethod",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header("Content-Type", "text/csv");
    res.attachment(`selected-products-sales-report-${from}-to-${to}.csv`);
    res.send(csv);
  } catch (error) {
    console.error("Export products sales error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;