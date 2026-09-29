import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

export function useResource(path, revision = 0) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: "", loading: true });
    api(path, { signal: controller.signal })
      .then((data) => setState({ data, error: "", loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ data: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [path, revision]);
  return state;
}
export function Field({ label, name, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} required {...props} />
    </label>
  );
}
export function Feedback({ error, children }) {
  return (
    <p
      className={error ? "feedback error" : "feedback"}
      role={error ? "alert" : "status"}
    >
      {error || children}
    </p>
  );
}
export function Modal({ title, close, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <div className="modal-header">
        <span className="micro">TRIPLE SEVEN / {title}</span>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Pagination({ page, pages, setPage }) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
        ← Previous
      </button>
      <span>
        {page} / {pages}
      </span>
      <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
        Next →
      </button>
    </div>
  );
}
export function ProductImage({ product, index = 0 }) {
  const [failed, setFailed] = useState(false);
  return product.images?.[index] && !failed ? (
    <img
      src={product.images[index]}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`photo-placeholder ${product.category}`}>
      <span className="micro">TRIPLE SEVEN / {product.category}</span>
      <span className="placeholder-mark">777</span>
      <span className="micro">PRODUCT PHOTOGRAPH COMING SOON</span>
    </div>
  );
}
