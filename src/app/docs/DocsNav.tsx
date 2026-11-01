"use client";
import { useEffect, useState } from "react";
export default function DocsNav({ sections }: { sections: [string, string][] }) {
  const [active, setActive] = useState(sections[0][0]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.id); }, { rootMargin: "-80px 0px -65% 0px" });
    sections.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [sections]);
  return (
    <aside className="lg:sticky lg:top-24 self-start">
      <div className="tick mb-3 hidden lg:block">On this page</div>
      <nav className="flex lg:flex-col gap-1 overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 pb-2 border-b border-line lg:border-0">
        {sections.map(([id, l]) => (
          <a key={id} href={`#${id}`} className={`text-sm whitespace-nowrap px-3 py-1.5 rounded-lg transition ${active === id ? "bg-lime/10 text-lime" : "text-mute hover:text-paper"}`}>{l}</a>
        ))}
      </nav>
    </aside>
  );
}
