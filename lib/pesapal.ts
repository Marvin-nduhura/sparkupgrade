// PesaPal v3 API Integration

const PESAPAL_BASE_URL =
  process.env.PESAPAL_BASE_URL || "https://pay.pesapal.com/v3";
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY!;
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET!;

let cachedToken: { token: string; expiresAt: number } | null = null;

// Get OAuth token
export async function getPesapalToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
  });

  if (!res.ok) throw new Error("Failed to get PesaPal token");

  const data = await res.json();
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + (data.expiryDate ? 0 : 5 * 60 * 1000), // 5 min cache
  };
  return data.token;
}

// Register IPN URL
export async function registerIPN(url: string): Promise<string> {
  const token = await getPesapalToken();
  const res = await fetch(
    `${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url, ipn_notification_type: "POST" }),
    }
  );
  if (!res.ok) throw new Error("Failed to register IPN");
  const data = await res.json();
  return data.ipn_id;
}

// Submit payment order
export interface PesapalOrderParams {
  id: string; // merchant reference
  currency: string;
  amount: number;
  description: string;
  callbackUrl: string;
  ipnId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
}

export async function submitOrder(params: PesapalOrderParams) {
  const token = await getPesapalToken();
  const res = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: params.id,
        currency: params.currency || "UGX",
        amount: params.amount,
        description: params.description,
        callback_url: params.callbackUrl,
        notification_id: params.ipnId,
        billing_address: {
          email_address: params.emailAddress,
          phone_number: params.phoneNumber,
          first_name: params.firstName,
          last_name: params.lastName,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to submit order");
  }

  return res.json();
  // Returns: { order_tracking_id, merchant_reference, redirect_url, error, status }
}

// Get transaction status
export async function getTransactionStatus(
  orderTrackingId: string
): Promise<{
  status: string;
  amount: number;
  currency: string;
  message: string;
}> {
  const token = await getPesapalToken();
  const res = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Failed to get transaction status");
  return res.json();
}

// Initiate STK Push for mobile money (PesaPal handles this through their hosted page
// but we can redirect to their URL which triggers USSD/STK on the phone)
export async function initiateMobileMoneyPayment(params: {
  amount: number;
  phone: string;
  description: string;
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
}) {
  const ipnId = process.env.PESAPAL_IPN_ID || "";
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/pesapal/callback`;

  const result = await submitOrder({
    id: params.reference,
    currency: "UGX",
    amount: params.amount,
    description: params.description,
    callbackUrl,
    ipnId,
    firstName: params.firstName,
    lastName: params.lastName,
    emailAddress: params.email,
    phoneNumber: params.phone,
  });

  return result;
}
