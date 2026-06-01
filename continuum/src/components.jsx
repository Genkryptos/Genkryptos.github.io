/* global React */
const { useState, useEffect, useRef } = React;

// ---------- Small shared building blocks ----------

function CodeBlock({ path, lang = 'python', children }) {
  return (
    <div className="code-block">
      {(path || lang) && (
        <div className="code-tab">
          <span className="path">{path}</span>
          <span className="lang">{lang}</span>
        </div>
      )}
      <pre>{children}</pre>
    </div>
  );
}

function Callout({ icon = '▲', title, children }) {
  return (
    <div className="callout">
      <div className="ico mono">{icon}</div>
      <div>
        {title && <strong>{title}</strong>}
        <span>{children}</span>
      </div>
    </div>
  );
}

function Eyebrow({ num, children }) {
  return (
    <div className="section-eyebrow">
      <span className="num">{num}</span>
      <span>{children}</span>
    </div>
  );
}

// Simple syntax-coloring helpers used in code blocks.
function k(s) { return <span className="tok-kw">{s}</span>; }
function f(s) { return <span className="tok-fn">{s}</span>; }
function s(s) { return <span className="tok-str">{s}</span>; }
function n(s) { return <span className="tok-num">{s}</span>; }
function c(s) { return <span className="tok-com">{s}</span>; }
function cl(s) { return <span className="tok-cls">{s}</span>; }
function self_(s) { return <span className="tok-self">{s}</span>; }

// Make these available to other JSX scripts.
Object.assign(window, { CodeBlock, Callout, Eyebrow, k, f, s, n, c, cl, self_ });
