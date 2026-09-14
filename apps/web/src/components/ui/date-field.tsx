"use client";

import { useEffect, useId, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const shown = value ? dayjs(value, "YYYY-MM-DD") : dayjs();
  const [cursor, setCursor] = useState(shown);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    setCursor(value ? dayjs(value, "YYYY-MM-DD") : dayjs());
  }, [value]);

  const start = cursor.startOf("month");
  const pad = (start.day() + 6) % 7;
  const days = Array.from({ length: cursor.daysInMonth() }, (_, i) => i + 1);
  const monthLabel = cursor.locale("pt-br").format("MMMM YYYY");

  return (
    <div ref={root} className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-steam">
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 min-w-[11rem] items-center rounded-[10px] border border-border bg-[var(--control)] px-3 text-left text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ketchup"
      >
        {value || "Escolher"}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute z-50 mt-1 w-64 rounded-[10px] border border-border bg-sheet p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setCursor((current) => current.subtract(1, "month"))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink hover:bg-counter"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-display text-sm font-semibold capitalize text-ink">{monthLabel}</p>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setCursor((current) => current.add(1, "month"))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink hover:bg-counter"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`} className="text-[11px] font-medium text-steam">
                {day}
              </span>
            ))}
            {Array.from({ length: pad }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const iso = cursor.date(day).format("YYYY-MM-DD");
              const selected = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-8 rounded-md text-sm tabular-nums",
                    selected ? "bg-ketchup font-semibold text-white" : "text-ink hover:bg-counter",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
