"use client";

import { useState } from "react";

interface Lesson { title: string; video_url?: string; text?: string }
interface Module { title: string; lessons: Lesson[] }

function youtubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/
  );
  return m ? m[1] : null;
}

export function CourseViewer({
  title,
  modules,
}: {
  title: string;
  modules: Module[];
}) {
  const [active, setActive] = useState<{ m: number; l: number }>({ m: 0, l: 0 });
  const [openModules, setOpenModules] = useState<Set<number>>(new Set([0]));

  const lesson = modules[active.m]?.lessons[active.l];
  const vid = youtubeId(lesson?.video_url);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-heading text-xl font-bold text-ink">{title}</h1>

      {/* Player */}
      <div className="mt-4 overflow-hidden rounded-card border border-line bg-black shadow-card">
        {vid ? (
          <iframe
            key={vid}
            src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1`}
            title={lesson?.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-sm text-white/60">
            —
          </div>
        )}
      </div>
      {lesson && (
        <div className="mt-3">
          <h2 className="font-semibold text-ink">{lesson.title}</h2>
          {lesson.text && (
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-ink-soft">
              {lesson.text}
            </p>
          )}
        </div>
      )}

      {/* Module / lesson list */}
      <div className="mt-6 space-y-2">
        {modules.map((mod, mi) => (
          <div key={mi} className="rounded-card border border-line bg-surface shadow-card">
            <button
              onClick={() =>
                setOpenModules((s) => {
                  const next = new Set(s);
                  if (next.has(mi)) next.delete(mi);
                  else next.add(mi);
                  return next;
                })
              }
              className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-ink"
            >
              <span>{mod.title || `Module ${mi + 1}`}</span>
              <span className="text-ink-faint">{openModules.has(mi) ? "▾" : "▸"}</span>
            </button>
            {openModules.has(mi) && (
              <ul className="border-t border-line">
                {mod.lessons.map((l, li) => (
                  <li key={li}>
                    <button
                      onClick={() => setActive({ m: mi, l: li })}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm ${
                        active.m === mi && active.l === li
                          ? "bg-primary-50 font-semibold text-primary-800"
                          : "text-ink-soft hover:bg-bg"
                      }`}
                    >
                      <span>▶</span>
                      <span className="truncate">{l.title || `Lesson ${li + 1}`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
