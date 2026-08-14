import type { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId } = req.query;

  if (!orderId || typeof orderId !== "string") {
    return res.status(400).json({ error: "Missing or invalid orderId parameter" });
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

  // A. Payments API Polling
  if (orderId.startsWith("mp_payment_")) {
    const realPaymentId = orderId.replace("mp_payment_", "");
    if (!token) return res.status(200).json({ status: "pending" });

    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${realPaymentId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (mpRes.ok) {
        const data = await mpRes.json();
        return res.status(200).json({ status: data.status });
      }
    } catch (err) {
      console.error("Error polling Payments API in serverless:", err);
    }
  }

  // B. Orders API Polling
  if (orderId.startsWith("mp_order_real_")) {
    const realOrderId = orderId.replace("mp_order_real_", "");
    if (!token) return res.status(200).json({ status: "pending" });

    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${realOrderId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (mpRes.ok) {
        const data = await mpRes.json();
        const status = data.status === "paid" ? "approved" : "pending";
        return res.status(200).json({ status });
      }
    } catch (err) {
      console.error("Error polling Orders API in serverless:", err);
    }
  }

  // C. Local simulated checkout fallback (approves automatically after 15 seconds)
  if (orderId.startsWith("mp_order_simulado_")) {
    const timestampStr = orderId.replace("mp_order_simulado_", "");
    const createdAt = parseInt(timestampStr, 10);
    const elapsed = Date.now() - createdAt;
    
    if (elapsed > 15000) {
      return res.status(200).json({ status: "approved" });
    }
    return res.status(200).json({ status: "pending" });
  }

  return res.status(200).json({ status: "pending" });
}
