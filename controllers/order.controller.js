import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { sendNewOrderEmail } from "../utils/orderEmail.js";

function createOrderNumber() {
  return `TH-${Date.now().toString().slice(-8)}`;
}

function resolveVariant(product, item = {}) {
  const variantId =
    item.variantId ||
    item.variant?._id ||
    item.variant?.id ||
    (typeof item.variant === "string" ? item.variant : null);

  if (variantId) {
    const byId = product.variants.id(variantId);
    if (byId) return byId;
  }

  if (item.sku) {
    const bySku = product.variants.find(
      (variant) => variant.sku && variant.sku === item.sku,
    );
    if (bySku) return bySku;
  }

  if (item.colorName || item.colorCode) {
    const byColor = product.variants.find((variant) => {
      const nameMatch =
        item.colorName &&
        variant.colorName?.toLowerCase() === String(item.colorName).toLowerCase();
      const codeMatch =
        item.colorCode &&
        variant.colorCode?.toLowerCase() === String(item.colorCode).toLowerCase();
      return nameMatch || codeMatch;
    });
    if (byColor) return byColor;
  }

  return null;
}

async function syncProductStockFromVariants(productId) {
  const product = await Product.findById(productId);
  if (!product?.variants?.length) return;

  product.stock = product.variants.reduce(
    (sum, variant) => sum + (Number(variant.stock) || 0),
    0,
  );
  await product.save();
}

async function decreaseStock(product, variant, quantity) {
  if (variant) {
    const stockUpdate = await Product.updateOne(
      { _id: product._id },
      { $inc: { "variants.$[v].stock": -quantity } },
      {
        arrayFilters: [
          { "v._id": variant._id, "v.stock": { $gte: quantity } },
        ],
      },
    );

    if (stockUpdate.modifiedCount !== 1) return false;
    await syncProductStockFromVariants(product._id);
    return true;
  }

  const stockUpdate = await Product.updateOne(
    { _id: product._id, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
  );
  return stockUpdate.modifiedCount === 1;
}

async function increaseStock(product, variant, quantity) {
  if (variant) {
    await Product.updateOne(
      { _id: product._id },
      { $inc: { "variants.$[v].stock": quantity } },
      { arrayFilters: [{ "v._id": variant._id }] },
    );
    await syncProductStockFromVariants(product._id);
    return;
  }

  await Product.updateOne(
    { _id: product._id },
    { $inc: { stock: quantity } },
  );
}

async function restockOrderItems(order) {
  for (const item of order.items || []) {
    if (!item.product) continue;

    const quantity = Math.abs(item.quantity || 1);
    const product = await Product.findById(item.product);
    if (!product) continue;

    const variant = resolveVariant(product, item);
    await increaseStock(product, variant, quantity);
  }
}

export async function createOrder(req, res, next) {
  try {
    const {
      customer,
      shippingAddress,
      paymentMethod: requestedPaymentMethod,
      paymentProof,
      items,
      totals,
    } = req.body;

    const paymentMethod =
      requestedPaymentMethod === "bank_tranfers"
        ? "bank_transfer"
        : requestedPaymentMethod || "cod";

    if (!customer || !shippingAddress || !items?.length || !totals) {
      return res.status(400).json({ message: "Incomplete order data" });
    }

    if (paymentMethod === "bank_transfer" && !paymentProof) {
      return res.status(400).json({
        message: "Payment proof is required for bank transfer",
      });
    }

    const normalizedItems = [];

    for (const item of items) {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const product = item.product ? await Product.findById(item.product) : null;

      if (!product) {
        return res
          .status(400)
          .json({ message: "A product in the order was not found" });
      }

      const hasVariants = product.variants?.length > 0;
      const variant = resolveVariant(product, item);

      if (hasVariants && !variant) {
        return res.status(400).json({
          message: `Please select a color/variant for ${product.name}`,
        });
      }

      const stock = variant ? variant.stock : product.stock;
      if (stock < quantity) {
        return res.status(400).json({
          message: `${variant?.colorName || product.name} is out of stock`,
        });
      }

      const decreased = await decreaseStock(product, variant, quantity);
      if (!decreased) {
        return res
          .status(409)
          .json({ message: "Stock changed. Please review your cart" });
      }

      normalizedItems.push({
        product: product._id,
        variantId: variant?._id,
        colorName: variant?.colorName || item.colorName || product.color || "",
        colorCode: variant?.colorCode || item.colorCode || "",
        sku: variant?.sku || item.sku || "",
        name: product.name,
        image: variant?.images?.[0] || product.images?.[0] || item.image || "",
        price: variant?.price ?? item.price ?? product.price,
        quantity,
      });
    }

    const order = await Order.create({
      orderNumber: createOrderNumber(),
      customer,
      shippingAddress,
      paymentMethod,
      paymentProof: paymentProof || "",
      items: normalizedItems,
      totals,
      status: paymentMethod === "cod" ? "confirmed" : "pending",
    });

    try {
      await sendNewOrderEmail(order);
    } catch (emailError) {
      console.error("Failed to send new order email:", emailError.message);
    }

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

export async function getOrderByNumber(req, res, next) {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function getOrders(req, res, next) {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const previousStatus = order.status;
    if (previousStatus === status) {
      return res.json(order);
    }

    if (status === "cancelled" && previousStatus !== "cancelled") {
      await restockOrderItems(order);
    }

    if (previousStatus === "cancelled" && status !== "cancelled") {
      for (const item of order.items || []) {
        if (!item.product) continue;
        const quantity = Math.abs(item.quantity || 1);
        const product = await Product.findById(item.product);
        if (!product) continue;
        const variant = resolveVariant(product, item);
        const decreased = await decreaseStock(product, variant, quantity);
        if (!decreased) {
          return res.status(409).json({
            message: "Not enough stock to reopen this cancelled order",
          });
        }
      }
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function deleteOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Restock only if order wasn't already cancelled (cancel already restocks)
    if (order.status !== "cancelled") {
      await restockOrderItems(order);
    }

    await order.deleteOne();
    res.json({ message: "Order deleted", orderNumber: order.orderNumber });
  } catch (error) {
    next(error);
  }
}
