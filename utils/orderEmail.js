import { sendMail } from "./mail.js";

function money(value) {
  return `Rs ${(Number(value) || 0).toLocaleString("en-PK")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendNewOrderEmail(order) {
  const to = process.env.ADMIN_EMAIL;

  if (!to) {
    console.warn("ADMIN_EMAIL is not set; skipping order email");
    return;
  }

  const customerName = `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim();
  const address = order.shippingAddress || {};
  const totals = order.totals || {};
  const items = order.items || [];

  const itemsText = items
    .map(
      (item) =>
        `- ${item.name}${item.colorName ? ` (${item.colorName})` : ""} x ${item.quantity} @ ${money(item.price)} = ${money((item.price || 0) * (item.quantity || 0))}`,
    )
    .join("\n");

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.name)}${item.colorName ? ` (${escapeHtml(item.colorName)})` : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${escapeHtml(item.quantity)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(money(item.price))}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(money((item.price || 0) * (item.quantity || 0)))}</td>
      </tr>`,
    )
    .join("");

  const subject = `New order ${order.orderNumber} — ${customerName || "Customer"}`;

  const text = `
New order received on Thaili

Order #: ${order.orderNumber}
Status: ${order.status}
Payment: ${order.paymentMethod}

Customer
Name: ${customerName}
Email: ${order.customer?.email || ""}
Phone: ${order.customer?.phone || ""}

Shipping
Address: ${address.address || ""}
City: ${address.city || ""}
State: ${address.state || ""}
Postal Code: ${address.postalCode || "-"}
Country: ${address.country || ""}

Items
${itemsText}

Totals
Subtotal: ${money(totals.subtotal)}
Shipping: ${money(totals.shipping)}
Grand Total: ${money(totals.grandTotal)}
`.trim();

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;">
    <h2 style="margin-bottom:4px;">New order received</h2>
    <p style="margin-top:0;color:#555;">Order <strong>${escapeHtml(order.orderNumber)}</strong> · ${escapeHtml(order.status)} · ${escapeHtml(order.paymentMethod)}</p>

    <h3 style="margin-bottom:8px;">Customer</h3>
    <p style="margin:0 0 16px;">
      <strong>${escapeHtml(customerName)}</strong><br/>
      Email: ${escapeHtml(order.customer?.email)}<br/>
      Phone: ${escapeHtml(order.customer?.phone)}
    </p>

    <h3 style="margin-bottom:8px;">Shipping address</h3>
    <p style="margin:0 0 16px;">
      ${escapeHtml(address.address)}<br/>
      ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postalCode || "")}<br/>
      ${escapeHtml(address.country)}
    </p>

    <h3 style="margin-bottom:8px;">Order items</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd;">Item</th>
          <th style="text-align:center;padding:8px;border-bottom:2px solid #ddd;">Qty</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd;">Price</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <p style="margin:0;">
      Subtotal: <strong>${escapeHtml(money(totals.subtotal))}</strong><br/>
      Shipping: <strong>${escapeHtml(money(totals.shipping))}</strong><br/>
      Grand Total: <strong style="font-size:16px;">${escapeHtml(money(totals.grandTotal))}</strong>
    </p>
  </div>
  `;

  await sendMail({ to, subject, text, html });
}
