import React, { useState } from "react";
import { money } from "../api.js";
import { Feedback, useResource } from "./Shared.jsx";

function comparison(current, previous) {
  if (!previous)
    return current
      ? "No previous-period baseline"
      : "No change from previous period";
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs previous period`;
}

export function Analytics() {
  const [days, setDays] = useState("30");
  const [revision, refresh] = useState(0);
  const { data, error, loading } = useResource(
    `/admin/dashboard/analytics?days=${days}`,
    revision,
  );
  return (
    <section>
      <div className="admin-heading">
        <div>
          <span className="micro">MEASURE YOUR STORE'S PERFORMANCE</span>
          <h2>ANALYTICS.</h2>
        </div>
        <div className="button-row">
          <label className="field">
            Date range
            <select
              value={days}
              onChange={(event) => setDays(event.target.value)}
            >
              {["7", "30", "90"].map((value) => (
                <option key={value} value={value}>
                  Last {value} days
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={loading}
            onClick={() => refresh((value) => value + 1)}
          >
            Refresh
          </button>
        </div>
      </div>
      <p className="muted">
        Order creation dates · UTC · Includes today (partial). Comparisons use
        the preceding equal-length period.
      </p>
      {loading && <p role="status">Loading analytics…</p>}
      {error && <Feedback error={error} />}
      {data && (
        <>
          <div className="admin-stats">
            {[
              ["sales", "Product sales", true],
              ["orders", "Orders", false],
              ["average", "Average order value", true],
              ["collected", "Collected payments", true],
            ].map(([key, label, currency]) => (
              <article key={key}>
                <span>{label}</span>
                <strong>
                  {currency ? money(data.current[key]) : data.current[key]}
                </strong>
                <small>
                  {comparison(data.current[key], data.previous[key])}
                </small>
              </article>
            ))}
          </div>
          <p className="muted">
            Cancelled orders are excluded. Product sales and average order value
            exclude shipping and include unpaid orders. Collected payments
            include shipping on paid orders created in this period; this is not
            a cash-received-by-date report.
          </p>
          <article className="order-panel">
            <h3>PRODUCT SALES OVER TIME</h3>
            {!data.current.orders && (
              <p>
                No orders in this period. Your chart will update as orders
                arrive.
              </p>
            )}
            <div
              className="analytics-chart"
              role="img"
              aria-label={`Daily product sales over ${data.days} days. Total ${money(data.current.sales)}. Exact daily values are available in the table below.`}
            >
              {data.daily.map((row) => (
                <div className="analytics-column" key={row.date}>
                  <div
                    style={{
                      height: `${Math.max(0, (row.sales / Math.max(1, ...data.daily.map((day) => day.sales))) * 100)}%`,
                    }}
                    title={`${row.date}: ${money(row.sales)} · ${row.orders} orders`}
                  />
                </div>
              ))}
            </div>
            <div className="analytics-axis">
              <span>{data.daily[0].date}</span>
              <span>{data.daily.at(-1).date}</span>
            </div>
            <details>
              <summary>View daily values</summary>
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Orders</th>
                      <th>Product sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{row.orders}</td>
                        <td>{money(row.sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </article>
          <article className="order-panel">
            <h3>TOP PRODUCTS</h3>
            <p>Ranked by product sales in the selected period.</p>
            {data.topProducts.length ? (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units ordered</th>
                      <th>Product sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((product) => (
                      <tr key={product._id}>
                        <td>{product.name}</td>
                        <td>{product.units}</td>
                        <td>{money(product.sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No product sales yet.</p>
            )}
          </article>
          <article className="order-panel">
            <h3>VISITOR ANALYTICS</h3>
            <p>
              Sessions, traffic sources and conversion rate are not tracked yet.
              These metrics will need storefront analytics tracking before they
              can be shown.
            </p>
          </article>
        </>
      )}
    </section>
  );
}
