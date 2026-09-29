import React, { useState } from "react";
import { api, money } from "../api.js";
import {
  useResource,
  ProductImage,
  Pagination,
  Modal,
  Feedback,
} from "./Shared.jsx";

export function Catalog({ onProduct }) {
  const [page, setPage] = useState(1),
    [category, setCategory] = useState(""),
    [revision, setRevision] = useState(0);
  const { data, error, loading } = useResource(
    `/products?page=${page}&limit=12${category ? `&category=${category}` : ""}`,
    revision,
  );
  return (
    <section className="collection section-pad" id="collection">
      <div className="section-heading">
        <h2>DROP 01 / GENESIS</h2>
        <span className="micro">[ THE BEGINNING OF SOMETHING ]</span>
      </div>
      <div className="collection-controls">
        <div className="category-tabs">
          {[
            ["", "ALL PIECES"],
            ["t-shirts", "T-SHIRTS"],
            ["hoodies", "HOODIES"],
            ["pants", "PANTS"],
            ["accessories", "ACCESSORIES"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="micro">
          {data ? `${data.pagination.total} PIECES` : "THE COLLECTION"}
        </span>
      </div>
      {loading && (
        <div className="product-grid" aria-label="Loading products">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      )}
      {error && (
        <div className="empty">
          <Feedback error={error} />
          <button onClick={() => setRevision(revision + 1)}>
            Retry collection
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="product-grid">
            {data.products.map((product, index) => (
              <button
                className="product-card"
                key={product._id}
                onClick={() => onProduct(product)}
              >
                <div className="product-photo">
                  <ProductImage product={product} />
                  <span className="spec">
                    SPEC {String((page - 1) * 12 + index + 1).padStart(2, "0")}
                  </span>
                  <span className="product-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="product-title">
                  <h3>{product.name}</h3>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="product-meta">
                  <span>
                    {product.variants
                      .map((v) => v.color)
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(" / ")}
                  </span>
                  <span>{money(product.pricePiastres)}</span>
                </div>
              </button>
            ))}
          </div>
          {!data.products.length && (
            <p className="empty">
              No pieces in this category yet. Check back soon.
            </p>
          )}
          <Pagination
            page={page}
            pages={data.pagination.pages}
            setPage={setPage}
          />
        </>
      )}
    </section>
  );
}

export function Product({ product, user, signIn, close, onBag, notify }) {
  const [variant, setVariant] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState(0);
  async function add(event) {
    event.preventDefault();
    if (!user) {
      close();
      signIn();
      notify("Sign in to save your bag.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const chosen = product.variants[Number(variant)];
      const cart = await api("/cart");
      const existing = cart.items.find(
        (item) =>
          item.productId === product._id &&
          item.size === chosen.size &&
          item.color === chosen.color,
      );
      const next = await api("/cart/items", {
        method: "PUT",
        body: {
          productId: product._id,
          size: chosen.size,
          color: chosen.color,
          quantity: (existing?.quantity || 0) + 1,
        },
      });
      onBag(next);
      notify("Added to your bag.");
      close();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="THE DETAILS" close={close} wide>
      <div className="product-detail">
        <div>
          <div className="detail-photo">
            <ProductImage key={photo} product={product} index={photo} />
          </div>
          {product.images.length > 1 && (
            <div className="photo-tabs">
              {product.images.map((_, i) => (
                <button
                  aria-label={`Product photo ${i + 1}`}
                  aria-pressed={photo === i}
                  key={i}
                  onClick={() => setPhoto(i)}
                >
                  {String(i + 1).padStart(2, "0")}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <span className="micro">DROP 01 / {product.category}</span>
          <h2>{product.name}</h2>
          <p className="price">{money(product.pricePiastres)}</p>
          <p>{product.description}</p>
          <form className="stack" onSubmit={add}>
            <label className="field">
              SELECT YOUR FIT
              <select
                required
                value={variant}
                onChange={(event) => setVariant(event.target.value)}
              >
                <option value="">Size / colour</option>
                {product.variants.map((v, i) => (
                  <option key={i} value={i} disabled={!v.stock}>
                    {v.size} / {v.color}
                    {!v.stock ? " — Sold out" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" disabled={busy || variant === ""}>
              {busy ? "ADDING…" : "ADD TO BAG ↗"}
            </button>
          </form>
          {error && <Feedback error={error} />}
          <div className="detail-note">
            <span>DELIVERY IN EGYPT</span>
            <span>CASH ON DELIVERY</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
