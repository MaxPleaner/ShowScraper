function $() {}
function F(t, n) {
  for (const e in n) t[e] = n[e];
  return t;
}
function B(t) {
  return t();
}
function C() {
  return Object.create(null);
}
function y(t) {
  t.forEach(B);
}
function L(t) {
  return typeof t == "function";
}
function ct(t, n) {
  return t != t
    ? n == n
    : t !== n || (t && typeof t == "object") || typeof t == "function";
}
function H(t) {
  return Object.keys(t).length === 0;
}
function I(t, ...n) {
  if (t == null) return $;
  const e = t.subscribe(...n);
  return e.unsubscribe ? () => e.unsubscribe() : e;
}
function lt(t, n, e) {
  t.$$.on_destroy.push(I(n, e));
}
function ut(t, n, e, i) {
  if (t) {
    const r = T(t, n, e, i);
    return t[0](r);
  }
}
function T(t, n, e, i) {
  return t[1] && i ? F(e.ctx.slice(), t[1](i(n))) : e.ctx;
}
function ot(t, n, e, i) {
  if (t[2] && i) {
    const r = t[2](i(e));
    if (n.dirty === void 0) return r;
    if (typeof r == "object") {
      const s = [],
        c = Math.max(n.dirty.length, r.length);
      for (let o = 0; o < c; o += 1) s[o] = n.dirty[o] | r[o];
      return s;
    }
    return n.dirty | r;
  }
  return n.dirty;
}
function st(t, n, e, i, r, s) {
  if (r) {
    const c = T(n, e, i, s);
    t.p(c, r);
  }
}
function ft(t) {
  if (t.ctx.length > 32) {
    const n = [],
      e = t.ctx.length / 32;
    for (let i = 0; i < e; i++) n[i] = -1;
    return n;
  }
  return -1;
}
function at(t) {
  return t ?? "";
}
let w = !1;
function G() {
  w = !0;
}
function J() {
  w = !1;
}
function K(t, n, e, i) {
  for (; t < n; ) {
    const r = t + ((n - t) >> 1);
    e(r) <= i ? (t = r + 1) : (n = r);
  }
  return t;
}
function W(t) {
  if (t.hydrate_init) return;
  t.hydrate_init = !0;
  let n = t.childNodes;
  if (t.nodeName === "HEAD") {
    const l = [];
    for (let u = 0; u < n.length; u++) {
      const a = n[u];
      a.claim_order !== void 0 && l.push(a);
    }
    n = l;
  }
  const e = new Int32Array(n.length + 1),
    i = new Int32Array(n.length);
  e[0] = -1;
  let r = 0;
  for (let l = 0; l < n.length; l++) {
    const u = n[l].claim_order,
      a =
        (r > 0 && n[e[r]].claim_order <= u
          ? r + 1
          : K(1, r, (g) => n[e[g]].claim_order, u)) - 1;
    i[l] = e[a] + 1;
    const f = a + 1;
    (e[f] = l), (r = Math.max(f, r));
  }
  const s = [],
    c = [];
  let o = n.length - 1;
  for (let l = e[r] + 1; l != 0; l = i[l - 1]) {
    for (s.push(n[l - 1]); o >= l; o--) c.push(n[o]);
    o--;
  }
  for (; o >= 0; o--) c.push(n[o]);
  s.reverse(), c.sort((l, u) => l.claim_order - u.claim_order);
  for (let l = 0, u = 0; l < c.length; l++) {
    for (; u < s.length && c[l].claim_order >= s[u].claim_order; ) u++;
    const a = u < s.length ? s[u] : null;
    t.insertBefore(c[l], a);
  }
}
function Q(t, n) {
  if (w) {
    for (
      W(t),
        (t.actual_end_child === void 0 ||
          (t.actual_end_child !== null &&
            t.actual_end_child.parentNode !== t)) &&
          (t.actual_end_child = t.firstChild);
      t.actual_end_child !== null && t.actual_end_child.claim_order === void 0;

    )
      t.actual_end_child = t.actual_end_child.nextSibling;
    n !== t.actual_end_child
      ? (n.claim_order !== void 0 || n.parentNode !== t) &&
        t.insertBefore(n, t.actual_end_child)
      : (t.actual_end_child = n.nextSibling);
  } else (n.parentNode !== t || n.nextSibling !== null) && t.appendChild(n);
}
function _t(t, n, e) {
  w && !e
    ? Q(t, n)
    : (n.parentNode !== t || n.nextSibling != e) &&
      t.insertBefore(n, e || null);
}
function R(t) {
  t.parentNode && t.parentNode.removeChild(t);
}
function dt(t, n) {
  for (let e = 0; e < t.length; e += 1) t[e] && t[e].d(n);
}
function U(t) {
  return document.createElement(t);
}
function A(t) {
  return document.createTextNode(t);
}
function ht() {
  return A(" ");
}
function mt() {
  return A("");
}
function pt(t, n, e, i) {
  return t.addEventListener(n, e, i), () => t.removeEventListener(n, e, i);
}
function yt(t, n, e) {
  e == null
    ? t.removeAttribute(n)
    : t.getAttribute(n) !== e && t.setAttribute(n, e);
}
function V(t) {
  return Array.from(t.childNodes);
}
function X(t) {
  t.claim_info === void 0 &&
    (t.claim_info = { last_index: 0, total_claimed: 0 });
}
function O(t, n, e, i, r = !1) {
  X(t);
  const s = (() => {
    for (let c = t.claim_info.last_index; c < t.length; c++) {
      const o = t[c];
      if (n(o)) {
        const l = e(o);
        return (
          l === void 0 ? t.splice(c, 1) : (t[c] = l),
          r || (t.claim_info.last_index = c),
          o
        );
      }
    }
    for (let c = t.claim_info.last_index - 1; c >= 0; c--) {
      const o = t[c];
      if (n(o)) {
        const l = e(o);
        return (
          l === void 0 ? t.splice(c, 1) : (t[c] = l),
          r
            ? l === void 0 && t.claim_info.last_index--
            : (t.claim_info.last_index = c),
          o
        );
      }
    }
    return i();
  })();
  return (
    (s.claim_order = t.claim_info.total_claimed),
    (t.claim_info.total_claimed += 1),
    s
  );
}
function Y(t, n, e, i) {
  return O(
    t,
    (r) => r.nodeName === n,
    (r) => {
      const s = [];
      for (let c = 0; c < r.attributes.length; c++) {
        const o = r.attributes[c];
        e[o.name] || s.push(o.name);
      }
      s.forEach((c) => r.removeAttribute(c));
    },
    () => i(n)
  );
}
function gt(t, n, e) {
  return Y(t, n, e, U);
}
function Z(t, n) {
  return O(
    t,
    (e) => e.nodeType === 3,
    (e) => {
      const i = "" + n;
      if (e.data.startsWith(i)) {
        if (e.data.length !== i.length) return e.splitText(i.length);
      } else e.data = i;
    },
    () => A(n),
    !0
  );
}
function xt(t) {
  return Z(t, " ");
}
function bt(t, n) {
  (n = "" + n), t.wholeText !== n && (t.data = n);
}
function $t(t, n, e, i) {
  e === null
    ? t.style.removeProperty(n)
    : t.style.setProperty(n, e, i ? "important" : "");
}
function wt(t, n) {
  return new t(n);
}
let p;
function m(t) {
  p = t;
}
function P() {
  if (!p) throw new Error("Function called outside component initialization");
  return p;
}
function vt(t) {
  P().$$.on_mount.push(t);
}
function Et(t) {
  P().$$.after_update.push(t);
}
const h = [],
  M = [],
  x = [],
  k = [],
  q = Promise.resolve();
let E = !1;
function z() {
  E || ((E = !0), q.then(D));
}
function Nt() {
  return z(), q;
}
function N(t) {
  x.push(t);
}
const v = new Set();
let d = 0;
function D() {
  if (d !== 0) return;
  const t = p;
  do {
    try {
      for (; d < h.length; ) {
        const n = h[d];
        d++, m(n), tt(n.$$);
      }
    } catch (n) {
      throw ((h.length = 0), (d = 0), n);
    }
    for (m(null), h.length = 0, d = 0; M.length; ) M.pop()();
    for (let n = 0; n < x.length; n += 1) {
      const e = x[n];
      v.has(e) || (v.add(e), e());
    }
    x.length = 0;
  } while (h.length);
  for (; k.length; ) k.pop()();
  (E = !1), v.clear(), m(t);
}
function tt(t) {
  if (t.fragment !== null) {
    t.update(), y(t.before_update);
    const n = t.dirty;
    (t.dirty = [-1]),
      t.fragment && t.fragment.p(t.ctx, n),
      t.after_update.forEach(N);
  }
}
const b = new Set();
let _;
function At() {
  _ = { r: 0, c: [], p: _ };
}
function St() {
  _.r || y(_.c), (_ = _.p);
}
function nt(t, n) {
  t && t.i && (b.delete(t), t.i(n));
}
function jt(t, n, e, i) {
  if (t && t.o) {
    if (b.has(t)) return;
    b.add(t),
      _.c.push(() => {
        b.delete(t), i && (e && t.d(1), i());
      }),
      t.o(n);
  } else i && i();
}
function Ct(t) {
  t && t.c();
}
function Mt(t, n) {
  t && t.l(n);
}
function et(t, n, e, i) {
  const { fragment: r, after_update: s } = t.$$;
  r && r.m(n, e),
    i ||
      N(() => {
        const c = t.$$.on_mount.map(B).filter(L);
        t.$$.on_destroy ? t.$$.on_destroy.push(...c) : y(c),
          (t.$$.on_mount = []);
      }),
    s.forEach(N);
}
function it(t, n) {
  const e = t.$$;
  e.fragment !== null &&
    (y(e.on_destroy),
    e.fragment && e.fragment.d(n),
    (e.on_destroy = e.fragment = null),
    (e.ctx = []));
}
function rt(t, n) {
  t.$$.dirty[0] === -1 && (h.push(t), z(), t.$$.dirty.fill(0)),
    (t.$$.dirty[(n / 31) | 0] |= 1 << n % 31);
}
function kt(t, n, e, i, r, s, c, o = [-1]) {
  const l = p;
  m(t);
  const u = (t.$$ = {
    fragment: null,
    ctx: [],
    props: s,
    update: $,
    not_equal: r,
    bound: C(),
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(n.context || (l ? l.$$.context : [])),
    callbacks: C(),
    dirty: o,
    skip_bound: !1,
    root: n.target || l.$$.root,
  });
  c && c(u.root);
  let a = !1;
  if (
    ((u.ctx = e
      ? e(t, n.props || {}, (f, g, ...S) => {
          const j = S.length ? S[0] : g;
          return (
            u.ctx &&
              r(u.ctx[f], (u.ctx[f] = j)) &&
              (!u.skip_bound && u.bound[f] && u.bound[f](j), a && rt(t, f)),
            g
          );
        })
      : []),
    u.update(),
    (a = !0),
    y(u.before_update),
    (u.fragment = i ? i(u.ctx) : !1),
    n.target)
  ) {
    if (n.hydrate) {
      G();
      const f = V(n.target);
      u.fragment && u.fragment.l(f), f.forEach(R);
    } else u.fragment && u.fragment.c();
    n.intro && nt(t.$$.fragment),
      et(t, n.target, n.anchor, n.customElement),
      J(),
      D();
  }
  m(l);
}
class Bt {
  $destroy() {
    it(this, 1), (this.$destroy = $);
  }
  $on(n, e) {
    if (!L(e)) return $;
    const i = this.$$.callbacks[n] || (this.$$.callbacks[n] = []);
    return (
      i.push(e),
      () => {
        const r = i.indexOf(e);
        r !== -1 && i.splice(r, 1);
      }
    );
  }
  $set(n) {
    this.$$set &&
      !H(n) &&
      ((this.$$.skip_bound = !0), this.$$set(n), (this.$$.skip_bound = !1));
  }
}
export {
  et as A,
  it as B,
  ut as C,
  st as D,
  ft as E,
  ot as F,
  Q as G,
  $ as H,
  lt as I,
  pt as J,
  dt as K,
  y as L,
  at as M,
  L as N,
  Bt as S,
  ht as a,
  _t as b,
  xt as c,
  jt as d,
  mt as e,
  St as f,
  nt as g,
  R as h,
  kt as i,
  Et as j,
  U as k,
  gt as l,
  V as m,
  yt as n,
  vt as o,
  $t as p,
  A as q,
  Z as r,
  ct as s,
  Nt as t,
  bt as u,
  At as v,
  M as w,
  wt as x,
  Ct as y,
  Mt as z,
};
