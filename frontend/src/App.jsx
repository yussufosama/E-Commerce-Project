import React, { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { Account } from "./components/Account.jsx";
import { Catalog, Product } from "./components/Catalog.jsx";
import { Bag } from "./components/Bag.jsx";
import { Orders } from "./components/Orders.jsx";
import { Admin } from "./components/Admin.jsx";

const viewFromHash = () =>
  ["bag", "orders", "admin"].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "shop";
function Hero() {
  return (
    <>
      <section className="hero" aria-label="Triple-Seven editorial">
        <img
          className="hero-photo"
          src="/assets/editorial-hero.png"
          alt="Editorial concept: front and back of an oversized black streetwear outfit"
          fetchPriority="high"
        />
        <div className="hero-topline micro">
          <span>EGYPT / INDEPENDENT STREETWEAR</span>
          <span>COLLECTION 001 — GENESIS</span>
        </div>
        <div className="hero-title">
          <span className="micro">MAKE YOUR OWN LUCK.</span>
          <h1>
            ROLL
            <br />
            FOR IT<span className="period">.</span>
          </h1>
        </div>
        <span className="hero-caption micro">EDITORIAL CONCEPT / 001</span>
      </section>
      <div className="hero-bottom">
        <p>
          LUCK ISN’T SOMETHING YOU WAIT FOR.
          <br />
          IT’S SOMETHING YOU ROLL FOR.
        </p>
        <a className="primary" href="#collection">
          EXPLORE THE DROP <span>↗</span>
        </a>
      </div>
      <div className="ticker" aria-hidden="true">
        <div>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>
              TRIPLE SEVEN · 777 <b>✳</b> MAKE YOUR OWN LUCK <b>✳</b>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
function Manifesto() {
  return (
    <section id="manifesto" className="manifesto">
      <div className="manifesto-art">
        <img
          src="/assets/triple-seven-logo.jpeg"
          alt="Triple Seven 777 cube logo"
          loading="lazy"
        />
      </div>
      <div className="manifesto-copy">
        <span className="micro">MANIFESTO / 777</span>
        <h2>
          WE DON’T BET ON
          <br />
          CHANCE. WE BET ON
          <br />
          THE GRIND.
        </h2>
        <p>
          TRIPLE SEVEN IS THE UNIFORM FOR THOSE WHO MAKE THEIR OWN LUCK.
          <br />
          NO SHORTCUTS. NO WAITING. JUST YOU AND THE NEXT ROLL.
        </p>
      </div>
    </section>
  );
}
function Footer({ openAccount }) {
  return (
    <footer className="section-pad" id="no777">
      <div className="footer-top">
        <div>
          <span className="micro">THE NEXT CHAPTER / 777</span>
          <h2>STAY IN THE LOOP.</h2>
        </div>
        <div className="footer-join">
          <p>Make your next move. Create your Triple-Seven account.</p>
          <button className="join-button" onClick={openAccount}>
            JOIN THE ROLL <span>↗</span>
          </button>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="wordmark">TRIPLE SEVEN</span>
        <span className="micro">EGYPT · MAKE YOUR OWN LUCK.</span>
        <a href="#collection" className="micro">
          BACK TO THE COLLECTION ↑
        </a>
      </div>
      <p className="footer-fine">
        © {new Date().getFullYear()} Triple-Seven. Editorial image is a
        generated concept. Actual product details appear in the collection.
      </p>
      <p className="footer-fine">Powered by Youssef Osama</p>
    </footer>
  );
}

export function App({ recovery }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [cart, setCart] = useState({ items: [] }),
    [view, setView] = useState(viewFromHash),
    [account, setAccount] = useState(recovery?.mode || null),
    [product, setProduct] = useState(null),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false);
  const intent = useRef(null),
    timer = useRef(null);
  function notify(message) {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 6000);
  }
  function onUser(next) {
    setUser(next);
    if (!next) {
      setCart({ items: [] });
      intent.current = null;
    } else
      api("/cart")
        .then(setCart)
        .catch((error) => notify(error.message));
  }
  useEffect(() => {
    let active = true;
    api("/users/me")
      .then((data) => {
        if (active) {
          setUser(data.user);
          api("/cart")
            .then((cart) => {
              if (active) setCart(cart);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const change = () => {
      setView(viewFromHash());
      setMenu(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (view !== "shop") return;
    const section = location.hash.slice(1);
    if (["collection", "manifesto", "no777"].includes(section)) {
      document.getElementById(section)?.scrollIntoView();
    }
  }, [view]);
  function navigate(next) {
    setMenu(false);
    location.hash = next === "shop" ? "collection" : next;
    setView(next);
    if (next !== "shop") window.scrollTo({ top: 0 });
  }
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="wordmark" href="#" onClick={() => setView("shop")}>
          TRIPLE SEVEN
        </a>
        <nav aria-label="Main navigation" className={menu ? "open" : ""}>
          <a href="#collection">COLLECTION</a>
          <a href="#manifesto">MANIFESTO</a>
          <a href="#no777">NO. 777</a>
          <button
            className="mobile-account"
            onClick={() => {
              setMenu(false);
              setAccount("login");
            }}
          >
            {user ? "ACCOUNT" : "SIGN IN"}
          </button>
          <button onClick={() => navigate("orders")}>ORDERS</button>
          {user?.role === "admin" && (
            <button onClick={() => navigate("admin")}>ADMIN</button>
          )}
        </nav>
        <div className="header-actions">
          <button className="account-link" onClick={() => setAccount("login")}>
            {user ? "ACCOUNT" : "SIGN IN"}
          </button>
          <button className="bag-link" onClick={() => navigate("bag")}>
            BAG <span>({String(count).padStart(2, "0")})</span>
          </button>
          <button
            className="mobile-menu"
            aria-expanded={menu}
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? "CLOSE" : "MENU"}
          </button>
        </div>
      </header>
      <main id="main">
        {view === "shop" ? (
          <>
            <Hero />
            <Catalog onProduct={setProduct} />
            <Manifesto />
          </>
        ) : !ready ? (
          <p className="empty">Loading your account…</p>
        ) : !user ? (
          <section className="empty">
            <h1>YOUR NEXT MOVE.</h1>
            <p>
              Sign in to view your{" "}
              {view === "bag"
                ? "bag"
                : view === "orders"
                  ? "orders"
                  : "account"}
              .
            </p>
            <button className="primary" onClick={() => setAccount("login")}>
              SIGN IN ↗
            </button>
          </section>
        ) : view === "bag" ? (
          <Bag
            onBag={setCart}
            intent={intent}
            goShop={() => navigate("shop")}
            onOrder={(order) => {
              notify(`Order ${order._id.slice(-8)} placed. Pay on delivery.`);
              navigate("orders");
            }}
          />
        ) : view === "orders" ? (
          <Orders notify={notify} />
        ) : user.role === "admin" ? (
          <Admin notify={notify} />
        ) : (
          <p className="empty">Admin access required.</p>
        )}
      </main>
      <Footer openAccount={() => setAccount(user ? "login" : "register")} />
      {account && (
        <Account
          key={account}
          user={user}
          initialMode={account}
          recovery={
            ["reset", "verify-complete"].includes(account) ? recovery : null
          }
          close={() => setAccount(null)}
          onUser={onUser}
        />
      )}
      {product && (
        <Product
          product={product}
          user={user}
          close={() => setProduct(null)}
          signIn={() => setAccount("login")}
          onBag={setCart}
          notify={notify}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
