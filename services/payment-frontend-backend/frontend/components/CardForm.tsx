"use client";
import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import React from "react";

// Helper to make booking first
async function createBooking() {
  const res = await fetch("http://localhost:3001/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation {
        BookRide(data: {
          userId: "user123",
          passengerId: "user123",
          rideId: "ride123",
          pickupLocation: "Location A",
          dropoffLocation: "Location B",
          status: PENDING
        }) {
          id
          rideId
          userId
          status
        }
      }`,
    }),
  });

  const data = await res.json();
  console.log("🚨 GraphQL booking response:", data);

  return data.data.BookRide; // return booking info to use in payment
}

async function confirmBooking(bookingId: string) {
  const res = await fetch("http://localhost:3001/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation {
        acceptBooking(id: "${bookingId}") {
          id
          status
        }
      }`,
    }),
  });

  const data = await res.json();
  console.log("🚨 GraphQL booking confirmation:", data);
  return data.data.acceptBooking; // return updated booking info
}

export default function CardForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Processing...");

    // Step 1: Create the booking
    const createdBooking = await createBooking();
    setBooking(createdBooking);

    if (!stripe || !elements) {
      setMessage("Stripe not loaded yet.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setMessage("Card element not found.");
      return;
    }

    // Use createToken within the submit handler
    const { token, error } = await stripe.createToken(cardElement);

    if (error) return setMessage(`❌ ${error.message}`);

    // Step 2: Proceed with mutation after token creation for payment
    const res = await fetch("http://localhost:3002/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation {
            makePayment(
              userId: "${createdBooking.userId}",
              rideId: "${createdBooking.rideId}",
              amount: 20,
              paymentMethod: "card",
              paymentToken: "${token.id}",
              email: "testuser@example.com"
            ) {
              clientSecret
              message
            }
          }
        `,
      }),
    });

    const data = await res.json();
    console.log("🚨 GraphQL payment response:", data);

    const clientSecret = data.data.makePayment.clientSecret;

    const confirm = await stripe.confirmCardPayment(clientSecret);

    if (confirm.error) {
      console.error("❌ Payment failed:", data.errors || data);
      setMessage(`❌ Payment failed: ${confirm.error.message}`);
      return;
    } else {
      setMessage("✅ Payment successful!");
      
      // Step 3: Update booking status to 'CONFIRMED' after payment is successful
      await confirmBooking(createdBooking.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement />
      <button type="submit" disabled={!stripe} className="bg-blue-500 text-white px-4 py-2 rounded">
        Pay
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
