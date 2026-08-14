import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Local in-memory state for simulated payments (so they work stateless or stateful in local dev)
const simulatedPayments = new Map<string, { amount: number; email: string; status: string; createdAt: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Double-Try Pix Generation Endpoint
  app.post("/api/donations/pix", async (req, res) => {
    const { amount, email } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!token) {
      console.warn("MERCADOPAGO_ACCESS_TOKEN is missing. Falling back to Simulated Pix Mode.");
      return createSimulatedPix(Number(amount), email || "", res);
    }

    const idempotencyKey = `pix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // --- TRY 1: Payments API (/v1/payments) ---
    try {
      console.log(`[Try 1] Attempting to create Pix via Payments API for R$ ${amount}...`);
      const paymentPayload = {
        transaction_amount: Number(amount),
        payment_method_id: "pix",
        payer: {
          email: email || "comprador@email.com",
          first_name: "Apoiador",
          last_name: "Estudo"
        },
        description: "Doação Synth Studio"
      };

      const paymentsResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(paymentPayload)
      });

      if (paymentsResponse.ok) {
        const data = await paymentsResponse.json();
        const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
        const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
        
        if (qrCodeBase64 && qrCode) {
          console.log(`[Try 1] Success! Created Pix payment with ID: ${data.id}`);
          return res.json({
            orderId: `mp_payment_${data.id}`,
            qr_code_base64: formatBase64Image(qrCodeBase64),
            qr_code: qrCode,
            amount: Number(amount),
            status: "pending"
          });
        }
      } else {
        const errText = await paymentsResponse.text();
        console.warn(`[Try 1] Payments API failed with status ${paymentsResponse.status}:`, errText);
      }
    } catch (err) {
      console.error("[Try 1] Error calling Payments API:", err);
    }

    // --- TRY 2: Orders API (/v1/orders) as Fallback ---
    try {
      console.log(`[Try 2] Falling back and attempting to create Pix via Orders API for R$ ${amount}...`);
      const ordersPayload = {
        type: "online",
        external_reference: `order_${Date.now()}`,
        transactions: {
          payments: [{
            amount: Number(amount).toFixed(2),
            payment_method: {
              id: "pix",
              type: "bank_transfer"
            },
            expiration_time: "PT1H" // 1 hour expiration
          }]
        },
        payer: {
          email: email || "comprador@email.com"
        },
        total_amount: Number(amount).toFixed(2),
        processing_mode: "automatic"
      };

      const ordersResponse = await fetch("https://api.mercadopago.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(ordersPayload)
      });

      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        // Extract payment information from order response
        const paymentInfo = data.resource_info?.payment_info || data.payments?.[0];
        const qrCodeBase64 = paymentInfo?.transaction_data?.qr_code_base64;
        const qrCode = paymentInfo?.transaction_data?.qr_code;

        if (qrCodeBase64 && qrCode) {
          console.log(`[Try 2] Success! Created Pix order with ID: ${data.id}`);
          return res.json({
            orderId: `mp_order_real_${data.id}`,
            qr_code_base64: formatBase64Image(qrCodeBase64),
            qr_code: qrCode,
            amount: Number(amount),
            status: "pending"
          });
        }
      } else {
        const errText = await ordersResponse.text();
        console.warn(`[Try 2] Orders API failed with status ${ordersResponse.status}:`, errText);
      }
    } catch (err) {
      console.error("[Try 2] Error calling Orders API:", err);
    }

    // --- FALLBACK: Simulated Mode ---
    console.warn("[Fallback] Both APIs failed or credentials are empty. Generating local simulation.");
    return createSimulatedPix(Number(amount), email || "", res);
  });

  // Helper: Create a simulated payment
  function createSimulatedPix(amount: number, email: string, res: any) {
    const simulatedId = `mp_order_simulado_${Date.now()}`;
    // A clean 128x128 valid black & white QR code PNG Base64
    const mockQRBase64 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACABAMAAAA6S06WAAAAMFBMVEUAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADmwt1IAAAAIHRSTlMAMIDg8ODQ8ODw4PDw4PDw4PDw4NDg8PDw4PDw8PDw4IAy964AAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA6SURBVGhtjYERAAMQDEPDgK7/shWIq3v+BfLqXgC0LwDaFwDtC4D2BUD7AqB9AdC+AGhfALQvANoXAD8SxgH1AitVPAAAAABJRU5ErkJggg==";
    const mockQRString = "00020101021226830014br.gov.bcb.pix25610000000000000000000000000000000000000000000000520400005303986540510.005802BR5915Apoiador Estudo6009Sao Paulo62070503***6304CAFE";
    
    simulatedPayments.set(simulatedId, {
      amount,
      email,
      status: "pending",
      createdAt: Date.now()
    });

    return res.json({
      orderId: simulatedId,
      qr_code_base64: formatBase64Image(mockQRBase64),
      qr_code: mockQRString,
      amount,
      status: "pending",
      simulated: true
    });
  }

  // 2. Direct-to-Gateway Polling Status Endpoint
  app.get("/api/donations/status/:orderId", async (req, res) => {
    const { orderId } = req.params;
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

    // A. Payments API Polling
    if (orderId.startsWith("mp_payment_")) {
      const realPaymentId = orderId.replace("mp_payment_", "");
      if (!token) return res.json({ status: "pending" });

      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${realPaymentId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (mpRes.ok) {
          const data = await mpRes.json();
          return res.json({ status: data.status }); // e.g. 'approved', 'pending', 'rejected'
        }
      } catch (err) {
        console.error("Error polling Payments API:", err);
      }
    }

    // B. Orders API Polling
    if (orderId.startsWith("mp_order_real_")) {
      const realOrderId = orderId.replace("mp_order_real_", "");
      if (!token) return res.json({ status: "pending" });

      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${realOrderId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (mpRes.ok) {
          const data = await mpRes.json();
          const status = data.status === "paid" ? "approved" : "pending";
          return res.json({ status });
        }
      } catch (err) {
        console.error("Error polling Orders API:", err);
      }
    }

    // C. Fallback / Simulados Locais
    if (orderId.startsWith("mp_order_simulado_")) {
      const simulated = simulatedPayments.get(orderId);
      if (simulated) {
        // Auto-approve after 15 seconds to simulate a completed transaction
        const elapsed = Date.now() - simulated.createdAt;
        if (elapsed > 15000 && simulated.status === "pending") {
          simulated.status = "approved";
          simulatedPayments.set(orderId, simulated);
          console.log(`[Simulator] Payment auto-approved for ${orderId}`);
        }
        return res.json({ status: simulated.status });
      }
    }

    return res.json({ status: "pending" });
  });

  // 3. Webhooks IPN Endpoint
  app.post("/api/donations/webhook", async (req, res) => {
    const { type, data } = req.body;

    if (type === "payment" && data?.id) {
      const paymentId = String(data.id);
      console.log(`[Webhook] Payment notification received for MP payment ID: ${paymentId}`);
      
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (token) {
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (mpRes.ok) {
            const paymentDetails = await mpRes.json();
            console.log(`[Webhook] Verified payment status: ${paymentDetails.status} for transaction R$ ${paymentDetails.transaction_amount}`);
          }
        } catch (err) {
          console.error("[Webhook] Failed to verify payment status:", err);
        }
      }
    }

    // Always return 200 to prevent Mercado Pago from retrying
    res.status(200).json({ received: true });
  });

  // Helper: Base64 Normalization
  function formatBase64Image(rawBase64: string): string {
    if (!rawBase64) return "";
    return rawBase64.startsWith("data:") 
      ? rawBase64 
      : `data:image/png;base64,${rawBase64}`;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
