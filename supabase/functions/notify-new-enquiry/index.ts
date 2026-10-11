Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("ENQUIRY_WEBHOOK_SECRET");
  const suppliedSecret = request.headers.get("x-webhook-secret");

  if (!webhookSecret || suppliedSecret !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await request.json();
    const enquiry = payload.record ?? payload;
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !apiKey) {
      throw new Error("OneSignal secrets are missing");
    }

    const property = enquiry.property_title || enquiry.subject || "Website enquiry";
    const buyer = enquiry.name || enquiry.buyer_name || "A buyer";
    const isBuyerRequest = String(enquiry.message || "").startsWith("PROPERTY_MATCH:");
    const isBuyerAssistance = /^Buyer Assistance(?:\s*[—–-]|\s+enquiry|\s+request)/i.test(String(enquiry.subject || ""));

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        filters: [
          { field: "tag", key: "app", relation: "=", value: "cave-homes-owner" }
        ],
        headings: { en: isBuyerAssistance ? "New Buyer Assistance enquiry" : isBuyerRequest ? "New website buyer request" : "New Cave Homes Spain enquiry" },
        contents: { en: `${buyer} sent an enquiry about ${property}` },
        url: isBuyerAssistance
          ? "https://cavehomesspain.com/admin.html#buyer-assistance"
          : isBuyerRequest
            ? "https://cavehomesspain.com/admin.html#buyer-requests"
            : "https://cavehomesspain.com/admin.html#inquiries"
      })
    });

    const result = await response.text();
    if (!response.ok) {
      throw new Error(`OneSignal error: ${result}`);
    }

    return new Response(result, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});