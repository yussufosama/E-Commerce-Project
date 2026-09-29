import React, { useState } from "react";
import { api, money } from "../api.js";
import { useResource, Feedback, Pagination } from "./Shared.jsx";
export function Orders({ notify }) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const {
    data,
    error: loadError,
    loading,
  } = useResource(`/orders?page=${page}`, revision);
  async function cancel(id) {
    if (!window.confirm("Cancel this pending order?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${id}/cancel`, { method: "POST", body: {} });
      setRevision(revision + 1);
      notify("Order cancelled.");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-pad page-section">
      <span className="micro">YOUR HISTORY / TRIPLE SEVEN</span>
      <h1>YOUR ORDERS.</h1>
      {loading && <p>Loading orders…</p>}
      {(error || loadError) && <Feedback error={error || loadError} />}{" "}
      {loadError && (
        <button onClick={() => setRevision(revision + 1)}>Try again</button>
      )}
      {data?.orders.map((order) => (
        <article className="order-panel" key={order._id}>
          <div className="order-top">
            <h3>NO. {order._id.slice(-8).toUpperCase()}</h3>
            <span className="badge">{order.status}</span>
            <strong>{money(order.totalPiastres)}</strong>
          </div>
          {order.items.map((item, i) => (
            <p key={i}>
              {item.name}{" "}
              <span className="muted">
                / {item.size} / {item.color} × {item.quantity}
              </span>
            </p>
          ))}
          <p className="muted">
            {order.address.street}, {order.address.city} ·{" "}
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
          <p className="micro">CASH ON DELIVERY / {order.paymentStatus}</p>
          {order.status === "pending" && (
            <button disabled={busy} onClick={() => cancel(order._id)}>
              Cancel order
            </button>
          )}
        </article>
      ))}
      {data && !data.orders.length && (
        <p className="empty">Your first roll is still ahead. No orders yet.</p>
      )}
      {data && (
        <Pagination
          page={page}
          pages={data.pagination.pages}
          setPage={setPage}
        />
      )}
    </section>
  );
}
