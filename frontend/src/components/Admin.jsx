import React, { useState } from "react";
import { api, money } from "../api.js";
import { Field, Feedback, Pagination, useResource } from "./Shared.jsx";

export function Admin({ notify }) {
  const [tab, setTab] = useState("products"),
    [page, setPage] = useState(1),
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
        variants: values.sizes
          .split(",")
          .map((size) => ({
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
    <section className="section-pad page-section">
      <span className="micro">AUTHORIZED PERSONNEL / STORE MANAGEMENT</span>
      <h1>CONTROL ROOM.</h1>
      <div className="category-tabs">
        {["products", "orders"].map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
          >
            {value}
          </button>
        ))}
      </div>
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
                      images: image ? [image] : [],
                    });
                  }}
                >
                  <label className="field">
                    Photo URL
                    <input
                      name="image"
                      type="url"
                      placeholder="https://…"
                      defaultValue={product.images[0] || ""}
                    />
                  </label>
                  <button disabled={busy}>Save photo</button>
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
                      min="-1000000"
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
