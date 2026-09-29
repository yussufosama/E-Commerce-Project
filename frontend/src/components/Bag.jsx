import React, { useEffect, useState } from "react";
import { api, money } from "../api.js";
import { Field, Feedback, useResource } from "./Shared.jsx";

export function Bag({ onBag, onOrder, intent, goShop }) {
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const {
    data: cart,
    error: loadError,
    loading,
  } = useResource("/cart", revision);
  const [quote, setQuote] = useState(null),
    [quoteError, setQuoteError] = useState("");
  const [uncertain, setUncertain] = useState(Boolean(intent.current));
  useEffect(() => {
    let active = true;
    setQuote(null);
    setQuoteError("");
    if (cart?.items.length)
      api("/orders/quote")
        .then((data) => {
          if (active) setQuote(data);
        })
        .catch((error) => {
          if (active)
            setQuoteError(
              error.status === 409
                ? "Checkout is not open yet. Delivery rates are being finalized. Your bag is saved."
                : error.message,
            );
        });
    return () => {
      active = false;
    };
  }, [cart]);
  async function quantity(item, value) {
    setBusy(true);
    setError("");
    try {
      const next = await api("/cart/items", {
        method: "PUT",
        body: {
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: value,
        },
      });
      onBag(next);
      setRevision(revision + 1);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function place(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    if (!intent.current) {
      const address = Object.fromEntries(new FormData(event.currentTarget));
      intent.current = {
        key: crypto.randomUUID(),
        body: {
          address: { ...address, country: "EG" },
          paymentMethod: "cash_on_delivery",
          expectedSubtotalPiastres: quote.subtotalPiastres,
          expectedTotalPiastres: quote.totalPiastres,
        },
      };
    }
    try {
      const result = await api("/orders", {
        method: "POST",
        headers: { "Idempotency-Key": intent.current.key },
        body: intent.current.body,
      });
      intent.current = null;
      setUncertain(false);
      onBag({ items: [] });
      onOrder(result.order);
    } catch (error) {
      if (error.status && error.status < 500) {
        intent.current = null;
        setUncertain(false);
        setRevision(revision + 1);
      } else setUncertain(true);
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p className="empty">Loading your bag…</p>;
  if (loadError)
    return (
      <div className="empty">
        <Feedback error={loadError} />
        <button onClick={() => setRevision(revision + 1)}>Try again</button>
      </div>
    );
  if (!cart.items.length && !uncertain)
    return (
      <div className="empty">
        <h2>ROOM FOR SOMETHING GOOD.</h2>
        <p>Your bag is empty.</p>
        <button className="primary" onClick={goShop}>
          EXPLORE THE COLLECTION ↗
        </button>
      </div>
    );
  return (
    <section className="section-pad page-section">
      <span className="micro">YOUR SELECTION / TRIPLE SEVEN</span>
      <h1>THE BAG.</h1>
      <div className="checkout-grid">
        <div>
          {cart.items.map((item) => (
            <article
              className="bag-item"
              key={`${item.productId}-${item.size}-${item.color}`}
            >
              <div className="bag-symbol">777</div>
              <div>
                <h3>{item.name}</h3>
                <p className="micro">
                  {item.size} / {item.color}
                </p>
                {!item.available && (
                  <p className="error">Currently unavailable</p>
                )}
                <div className="quantity">
                  <button
                    disabled={busy || uncertain}
                    aria-label={`Decrease ${item.name}`}
                    onClick={() => quantity(item, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    disabled={busy || uncertain || item.quantity >= 10}
                    aria-label={`Increase ${item.name}`}
                    onClick={() => quantity(item, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    disabled={busy || uncertain}
                    className="text-button"
                    onClick={() => quantity(item, 0)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <strong>{money(item.subtotalPiastres)}</strong>
            </article>
          ))}
          <button className="text-button" onClick={goShop}>
            ← Continue exploring
          </button>
        </div>
        <div className="checkout-panel">
          <h2>THE FINAL DETAILS.</h2>
          <div className="total-row">
            <span>Subtotal</span>
            <span>{money(cart.subtotalPiastres)}</span>
          </div>
          {quote && (
            <>
              <div className="total-row">
                <span>Delivery</span>
                <span>{money(quote.shippingPiastres)}</span>
              </div>
              <div className="total-row grand">
                <span>Total</span>
                <span>{money(quote.totalPiastres)}</span>
              </div>
            </>
          )}
          {quoteError && <Feedback>{quoteError}</Feedback>}
          <form className="stack" onSubmit={place}>
            <fieldset disabled={busy || uncertain}>
              <Field
                name="name"
                label="Full name"
                autoComplete="name"
                maxLength={100}
              />
              <Field
                name="phone"
                label="Egyptian mobile number"
                type="tel"
                autoComplete="tel"
                placeholder="01012345678"
              />
              <div className="field-pair">
                <Field name="governorate" label="Governorate" />
                <Field name="city" label="City" autoComplete="address-level2" />
              </div>
              <Field
                name="street"
                label="Street, building, floor & apartment"
                autoComplete="street-address"
                maxLength={300}
              />
            </fieldset>
            <p className="micro">PAYMENT / CASH ON DELIVERY</p>
            {uncertain && (
              <Feedback>
                We could not confirm the result. Retry the same order below to
                avoid a duplicate. Your original address and total will be
                reused.
              </Feedback>
            )}
            <button
              className="primary"
              disabled={busy || (!uncertain && !quote?.canCheckout)}
            >
              {busy
                ? "PLACING ORDER…"
                : uncertain
                  ? "RETRY SAME ORDER ↗"
                  : "PLACE ORDER ↗"}
            </button>
            <p className="muted">
              Review your address and total before placing your order.
            </p>
          </form>
          {error && <Feedback error={error} />}
        </div>
      </div>
    </section>
  );
}
