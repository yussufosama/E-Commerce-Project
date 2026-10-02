import React, { useState } from "react";
import { Feedback, useResource } from "./Shared.jsx";

export function Shipping() {
  const [revision, refresh] = useState(0);
  const { data, error, loading } = useResource(
    "/admin/dashboard/shipping",
    revision,
  );
  return (
    <section>
      <div className="admin-heading">
        <div>
          <span className="micro">DELIVERY PARTNERS</span>
          <h2>SHIPPING.</h2>
        </div>
        <button
          disabled={loading}
          onClick={() => refresh((value) => value + 1)}
        >
          Refresh
        </button>
      </div>
      <article className="order-panel">
        <h3>BOSTA</h3>
        <p>Setup in progress. Shipment booking is not enabled yet.</p>
        {loading && <p role="status">Checking local configuration…</p>}
        {error && <Feedback error={error} />}
        {data && (
          <>
            <div className="admin-summary-row">
              <span>API key in backend</span>
              <strong>
                {data.keyConfigured
                  ? "Saved · not validated"
                  : "Not configured"}
              </strong>
            </div>
            <div className="admin-summary-row">
              <span>Pickup location ID</span>
              <strong>
                {data.pickupConfigured
                  ? "Saved · not validated"
                  : "Not configured"}
              </strong>
            </div>
            <div className="admin-summary-row">
              <span>Customer shipping fee</span>
              <strong>
                {data.shippingConfigured ? "Configured" : "Not configured"}
              </strong>
            </div>
          </>
        )}
        <ol>
          <li>
            Create a Bosta business account and complete its verification.
          </li>
          <li>Add the location where Bosta should collect your parcels.</li>
          <li>
            Create a read/write API key and save it privately in the backend
            configuration.
          </li>
          <li>
            Connect delivery-area selection and validate shipment creation
            before enabling bookings.
          </li>
        </ol>
        <div className="button-row">
          <a href="https://business.bosta.co/" target="_blank" rel="noreferrer">
            Open Bosta ↗
          </a>
          <a
            href="https://docs.bosta.co/docs/how-to/get-your-api-key/"
            target="_blank"
            rel="noreferrer"
          >
            API key instructions ↗
          </a>
        </div>
      </article>
      <article className="order-panel">
        <h3>HOW ORDERS WILL SHIP</h3>
        <p>
          Confirm a store order, review its Bosta delivery area and
          cash-on-delivery amount, then create its shipment. Creating a shipment
          and requesting a courier pickup are separate steps.
        </p>
        <p>
          The shipping fee charged at checkout is separate from Bosta's fees for
          your business. It still needs to be chosen by the store owner.
        </p>
      </article>
    </section>
  );
}
