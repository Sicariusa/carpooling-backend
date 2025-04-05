"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CardForm from "../components/CardForm";
import React from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-bold mb-4">Pay with Card (Test Mode)</h1>
      <Elements stripe={stripePromise}>
        <CardForm />
      </Elements>
    </main>
  );
}
