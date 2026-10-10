import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page-head" style={{ minHeight: "50vh" }}>
      <div className="eyebrow">404</div>
      <h1>That page took a cache miss.</h1>
      <p className="lede">It doesn&apos;t exist (yet). Try the HLD path or the question bank.</p>
      <div className="hero-cta">
        <Link className="btn btn-primary" href="/learn">Start learning</Link>
        <Link className="btn" href="/questions">Browse questions</Link>
      </div>
    </div>
  );
}
