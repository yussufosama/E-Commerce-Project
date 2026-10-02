import React, { useState } from "react";
import { api, money } from "../api.js";
import { Field, Feedback, Pagination, useResource } from "./Shared.jsx";
import "./admin.css";
import { Analytics } from "./Analytics.jsx";
import { Shipping } from "./Shipping.jsx";

export function Admin({ notify }) {
  const [tab, setTab] = useState("overview");
  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <span className="micro">TRIPLE SEVEN / STAFF</span>
        <h1>
          CONTROL
          <br />
          ROOM.
        </h1>
        <nav aria-label="Admin sections">
          {[
            ["overview", "Dashboard"],
            ["analytics", "Analytics"],
            ["shipping", "Shipping"],
            ["products", "Products & stock"],
            ["orders", "Orders"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
              <span>↗</span>
            </button>
          ))}
        </nav>
        <a href="#shop">← Back to storefront</a>
      </aside>
      <div className="admin-content">
        {tab === "overview" ? (
          <Overview open={setTab} />
        ) : tab === "analytics" ? (
          <Analytics />
        ) : tab === "shipping" ? (
          <Shipping />
        ) : (
          <Management key={tab} tab={tab} notify={notify} />
        )}
      </div>
    </section>
  );
}

function Overview({ open }) {
  const [revision, refresh] = useState(0);
  const { data, error, loading } = useResource("/admin/dashboard", revision);
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="micro">YOUR STORE AT A GLANCE</span>
          <h2>DASHBOARD.</h2>
        </div>
        <button disabled={loading} onClick={() => refresh((v) => v + 1)}>
          Refresh
        </button>
      </div>
      {loading && <p role="status">Loading store totals…</p>}
      {error && <Feedback error={error} />}
      {data && (
        <>
          <div className="admin-stats">
            {[
              [
                "Active products",
                data.activeProducts,
                `${data.products} total products`,
              ],
              [
                "Pending orders",
                data.ordersByStatus.pending,
                "Awaiting confirmation",
              ],
              [
                "Low-stock variants",
                data.lowStockVariants,
                "Active variants with 5 or fewer",
              ],
              [
                "Collected payments",
                money(data.collectedPiastres),
                "All time · paid orders including shipping",
              ],
            ].map(([label, value, help]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{help}</small>
              </article>
            ))}
          </div>
          <div className="admin-overview-grid">
            <article className="order-panel">
              <h3>FULFILMENT</h3>
              {Object.entries(data.ordersByStatus).map(([status, count]) => (
                <div className="admin-summary-row" key={status}>
                  <span>{status}</span>
                  <strong>{count}</strong>
                </div>
              ))}
              <button onClick={() => open("orders")}>Manage orders ↗</button>
            </article>
            <article className="order-panel">
              <h3>RECENT ORDERS</h3>
              {data.recentOrders.length ? (
                data.recentOrders.map((order) => (
                  <div className="admin-summary-row" key={order._id}>
                    <div>
                      <strong>#{order._id.slice(-8)}</strong>
                      <small>
                        {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                        {order.status}
                      </small>
                    </div>
                    <strong>{money(order.totalPiastres)}</strong>
                  </div>
                ))
              ) : (
                <p>No orders yet. New customer orders will appear here.</p>
              )}
            </article>
          </div>
          <article className="order-panel">
            <h3>BUILD YOUR NEXT DROP.</h3>
            <p>
              Add products, set prices and keep each size and colour in stock.
            </p>
            <button className="primary" onClick={() => open("products")}>
              Manage products ↗
            </button>
          </article>
        </>
      )}
    </>
  );
}

function Management({ tab, notify }) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const {
    data,
    error: loadError,
    loading,
  } = useResource(`/admin/${tab}?page=${page}`, revision);
  async function write(path, body, method = "PATCH") {
    setBusy(true);
    setError("");
    try {
      await api(path, { method, body });
      setRevision(revision + 1);
      notify("Store updated.");
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const saved = await write(
      "/admin/products",
      {
        name: values.name,
        slug: values.slug,
        description: values.description,
        category: values.category,
        pricePiastres: Math.round(Number(values.price) * 100),
        images: values.image ? [values.image] : [],
        variants: values.sizes.split(",").map((size) => ({
          size: size.trim(),
          color: values.color,
          stock: Number(values.stock),
        })),
      },
      "POST",
    );
    if (saved) form.reset();
  }
  return (
    <section>
      <div className="admin-heading">
        <div>
          <span className="micro">STORE MANAGEMENT</span>
          <h2>{tab === "products" ? "PRODUCTS & STOCK." : "ORDERS."}</h2>
        </div>
        <button
          disabled={busy || loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          Refresh
        </button>
      </div>
      {data && (
        <p>
          {data.pagination.total} {tab} · Page {page}
        </p>
      )}
      {data?.[tab]?.length === 0 && <p>No {tab} yet.</p>}
      {(error || loadError) && <Feedback error={error || loadError} />}{" "}
      {loading && <p>Loading…</p>}
      {loadError && (
        <button onClick={() => setRevision(revision + 1)}>Try again</button>
      )}
      {tab === "products" && (
        <div className="admin-grid">
          <div>
            {data?.products.map((product) => (
              <article className="order-panel" key={product._id}>
                <h3>{product.name}</h3>
                <details>
                  <summary>Edit product details</summary>
                  <form
                    className="stack"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const values = Object.fromEntries(
                        new FormData(event.currentTarget),
                      );
                      write(`/admin/products/${product._id}`, {
                        name: values.name,
                        slug: values.slug,
                        description: values.description,
                        category: values.category,
                      });
                    }}
                  >
                    <Field
                      name="name"
                      label="Product name"
                      maxLength={120}
                      defaultValue={product.name}
                    />
                    <Field
                      name="slug"
                      label="URL slug"
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      defaultValue={product.slug}
                    />
                    <Field
                      name="description"
                      label="Description"
                      maxLength={3000}
                      defaultValue={product.description}
                    />
                    <label className="field">
                      Category
                      <select name="category" defaultValue={product.category}>
                        {["t-shirts", "hoodies", "pants", "accessories"].map(
                          (category) => (
                            <option key={category}>{category}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <button disabled={busy}>Save details</button>
                  </form>
                </details>
                <p>
                  {money(product.pricePiastres)} /{" "}
                  {product.active ? "Active" : "Archived"}
                </p>
                <form
                  className="inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    write(`/admin/products/${product._id}`, {
                      pricePiastres: Math.round(
                        Number(new FormData(event.currentTarget).get("price")) *
                          100,
                      ),
                    });
                  }}
                >
                  <Field
                    name="price"
                    label="Price in EGP"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={product.pricePiastres / 100}
                  />
                  <button disabled={busy}>Save price</button>
                </form>
                <form
                  className="inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const image = new FormData(event.currentTarget).get(
                      "image",
                    );
                    write(`/admin/products/${product._id}`, {
                      images: image
                        .split("\n")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    });
                  }}
                >
                  <label className="field">
                    Photo URLs (one HTTPS link per line, up to 10)
                    <textarea
                      name="image"
                      placeholder="https://…"
                      rows={3}
                      defaultValue={product.images.join("\n")}
                    />
                  </label>
                  <button disabled={busy}>Save photos</button>
                </form>
                {product.variants.map((variant) => (
                  <form
                    key={`${variant.size}-${variant.color}`}
                    className="inline-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      write(`/admin/products/${product._id}/inventory`, {
                        size: variant.size,
                        color: variant.color,
                        adjustment: Number(
                          new FormData(event.currentTarget).get("adjustment"),
                        ),
                      });
                    }}
                  >
                    <span>
                      {variant.size} / {variant.color}: {variant.stock}
                    </span>
                    <Field
                      name="adjustment"
                      label="Stock change"
                      type="number"
                      step="1"
                      min={-variant.stock}
                      max="1000000"
                    />
                    <button disabled={busy}>Apply</button>
                  </form>
                ))}
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `${product.active ? "Archive" : "Restore"} ${product.name}?`,
                      )
                    )
                      write(`/admin/products/${product._id}`, {
                        active: !product.active,
                      });
                  }}
                >
                  {product.active ? "Archive" : "Restore"}
                </button>
              </article>
            ))}
          </div>
          <form className="checkout-panel stack" onSubmit={create}>
            <h2>NEW PIECE.</h2>
            <Field name="name" label="Product name" maxLength={120} />
            <Field
              name="slug"
              label="URL slug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
            <Field name="description" label="Description" maxLength={3000} />
            <label className="field">
              Category
              <select name="category">
                {["t-shirts", "hoodies", "pants", "accessories"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
            <Field
              name="price"
              label="Price in EGP"
              type="number"
              min="0"
              step="0.01"
            />
            <label className="field">
              Photo URL (optional)
              <input name="image" type="url" placeholder="https://…" />
            </label>
            <Field
              name="sizes"
              label="Sizes, comma separated"
              defaultValue="S,M,L,XL"
            />
            <Field name="color" label="Colour" />
            <Field
              name="stock"
              label="Initial stock per size"
              type="number"
              min="0"
              step="1"
            />
            <button className="primary" disabled={busy}>
              CREATE PRODUCT ↗
            </button>
          </form>
        </div>
      )}
      {tab === "orders" &&
        data?.orders.map((order) => (
          <article className="order-panel" key={order._id}>
            <div className="order-top">
              <h3>{order._id.slice(-8)}</h3>
              <span className="badge">{order.status}</span>
              <strong>{money(order.totalPiastres)}</strong>
            </div>
            <p>
              {order.address.name} / {order.address.phone}
            </p>
            <p>
              {new Date(order.createdAt).toLocaleString()} · Cash on delivery ·{" "}
              {order.paymentStatus}
            </p>
            <p>
              Items: {money(order.subtotalPiastres)} · Shipping:{" "}
              {money(order.shippingPiastres)}
            </p>
            <p>
              {order.address.street}, {order.address.city},{" "}
              {order.address.governorate}
            </p>
            {order.items.map((item, i) => (
              <p key={i}>
                {item.name} / {item.size} / {item.color} × {item.quantity}
              </p>
            ))}
            <div className="button-row">
              {(
                {
                  pending: ["confirmed", "cancelled"],
                  confirmed: ["shipped", "cancelled"],
                  shipped: ["delivered"],
                }[order.status] || []
              ).map((status) => (
                <button
                  key={status}
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Mark ${status}?${status === "delivered" ? " Confirm cash payment has been collected." : ""}`,
                      )
                    )
                      write(`/admin/orders/${order._id}/status`, { status });
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </article>
        ))}
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
