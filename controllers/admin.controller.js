import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

export async function getStats(req, res, next) {
  try {
    const [products, orders, customers, revenueAgg] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totals.grandTotal" } } },
      ]),
    ]);

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
    const lowStock = await Product.aggregate([
      {
        $project: {
          name: 1,
          stock: 1,
          variants: {
            $filter: {
              input: { $ifNull: ["$variants", []] },
              as: "variant",
              cond: { $lte: ["$$variant.stock", 5] },
            },
          },
        },
      },
      { $match: { $or: [{ stock: { $lte: 5 } }, { "variants.0": { $exists: true } }] } },
      { $sort: { stock: 1 } },
      { $limit: 5 },
    ]);

    const statusBreakdown = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      products,
      orders,
      customers,
      revenue: revenueAgg[0]?.total || 0,
      recentOrders,
      lowStock,
      statusBreakdown,
    });
  } catch (error) {
    next(error);
  }
}
