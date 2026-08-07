"use client";

import { useEffect, useRef, useState } from "react";
import { PLATE_CLASS, logoPlate } from "@/lib/leads/engine/logo";
import type { GroupOp, LogoCrop, SnapshotLogo } from "@/lib/leads/engine/group-types";

/**
 * TRIM THE CHURCH'S MARK — the last thing on a card a reviewer could see and not
 * fix.
 *
 * The pipeline takes whatever image it found, and what it found is routinely
 * more than the logo: a wordmark with a tagline baked in, a mark sitting in a
 * banner strip with a phone number beside it, a square export with a third of it
 * white space so the logo renders at half the size of everyone else's. None of
 * that is wrong enough to reject the picture — the alternatives are usually
 * worse — and all of it looks careless on a page we are asking a church to
 * judge us by.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * IT CUTS PIXELS, IT DOES NOT STORE A RECTANGLE.
 *
 * The obvious design is to save the crop as four numbers and let the demo apply
 * them in CSS. It was not taken, for a reason that is about where the risk goes:
 * a demo's logo is drawn by four templates and whatever the fifth one does, so a
 * rectangle would be a rule every one of them has to honour, forever, with no
 * way to check that a new template did. Cutting once, here, means the export
 * ships an ordinary image and every template keeps drawing an ordinary image.
 *
 * The cut is made against the SAME thumbnail the export would have shipped, so
 * nothing is lost that would otherwise have been sent — this is not a
 * lower-resolution path. The result goes through `/api/upload` → `putLogo`,
 * which is content-addressed: the same crop made twice writes one blob, and the
 * URL is the same same-origin `/api/asset/...` proxy path the export produces
 * when it copies an untrimmed logo.
 *
 * THE COLOURS DO NOT MOVE. The palette is measured from the whole mark, upstream
 * and per candidate, and cropping does not re-measure it. That is said out loud
 * below rather than left to be discovered: trimming a white margin off is the
 * common case and changes nothing, but cropping down to one coloured letter is a
 * thing somebody might reasonably expect to repaint the page, and it will not.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** The smallest selection worth keeping, as a fraction of the image. Below this
 *  a drag is a mis-click rather than a crop, and cropping to nothing would ship
 *  a church a 3px picture. */
const MIN_SIDE = 0.05;

/**
 * HOW BIG THE PICTURE IS DRAWN — and it is drawn as big as the screen allows,
 * on purpose.
 *
 * MEASURED: every thumbnail in the corpus is 108×108. At its own size the thing
 * being cropped is a postage stamp — trimming a tagline off one means dragging a
 * box to within two or three pixels of a letter you cannot quite see. The crop
 * itself is cut at the SOURCE resolution from a normalised rectangle, so blowing
 * the preview up costs nothing in accuracy; it only makes the gesture bigger.
 * Hence an upscale cap rather than a downscale one, and a cap at all only so a
 * 32px favicon does not become a wall of mush with no edges to aim at.
 *
 * WHAT THIS DOES NOT FIX: 108×108 is also the ceiling on what a church's demo
 * ships today — the export copies this same thumbnail — so a crop is a piece of
 * that, never something sharper. Trimming a third off a wordmark leaves ~70px of
 * logo. Worth knowing before cropping hard; the fix for it is a bigger source,
 * not a better cropper.
 */
const MAX_UPSCALE = 8;
const MAX_TALL = 820;
/** Everything in the dialog that is not the picture: title, prose, buttons. */
const CHROME = 300;

/** The drawn size of the image inside a box, preserving its own proportions. */
function fitted(
  natural: { w: number; h: number },
  box: { w: number; h: number },
): { w: number; h: number } {
  if (!natural.w || !natural.h || !box.w || !box.h) return { w: 0, h: 0 };
  const scale = Math.min(box.w / natural.w, box.h / natural.h, MAX_UPSCALE);
  return { w: Math.round(natural.w * scale), h: Math.round(natural.h * scale) };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };

/** Two corners in normalised space → a rectangle, clamped to the image. */
function rectOf(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  const x1 = Math.max(0, Math.min(1, Math.min(a.x, b.x)));
  const y1 = Math.max(0, Math.min(1, Math.min(a.y, b.y)));
  const x2 = Math.max(0, Math.min(1, Math.max(a.x, b.x)));
  const y2 = Math.max(0, Math.min(1, Math.max(a.y, b.y)));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/**
 * The cropped bytes, cut at the source image's own resolution.
 *
 * WebP first and PNG as the fallback, both of which `putLogo` accepts and both
 * of which keep transparency — a logo cut out of a plate and re-saved onto white
 * would come back as a white box on any demo whose background is not white,
 * which is most of them.
 */
async function cut(img: HTMLImageElement, rect: Rect): Promise<File | null> {
  const w = Math.max(1, Math.round(rect.w * img.naturalWidth));
  const h = Math.max(1, Math.round(rect.h * img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(
    img,
    Math.round(rect.x * img.naturalWidth),
    Math.round(rect.y * img.naturalHeight),
    w,
    h,
    0,
    0,
    w,
    h,
  );

  const blob = await new Promise<Blob | null>((done) =>
    canvas.toBlob((b) => done(b), "image/webp", 0.95),
  );
  if (blob && blob.type === "image/webp") {
    return new File([blob], "logo-crop.webp", { type: "image/webp" });
  }
  const png = await new Promise<Blob | null>((done) => canvas.toBlob((b) => done(b), "image/png"));
  return png ? new File([png], "logo-crop.png", { type: "image/png" }) : null;
}

export function LogoCropper({
  open,
  orgId,
  churchName,
  logo,
  crop,
  onClose,
  onOp,
}: {
  open: boolean;
  orgId: string;
  churchName: string;
  /** The mark being trimmed — the one `resolve()` says this card is shipping. */
  logo: SnapshotLogo;
  /** The crop already stored for this mark, if there is one. */
  crop: LogoCrop | null;
  onClose: () => void;
  onOp: (op: GroupOp) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  /**
   * The selection, in normalised image coordinates.
   *
   * NORMALISED RATHER THAN PIXELS, because the frame is responsive and the
   * source is not: pixels measured against a 420px-wide preview mean nothing to
   * a 900px image, and the one thing this component must not get wrong is which
   * part of the picture was selected.
   */
  const [rect, setRect] = useState<Rect>(crop ? { x: crop.x, y: crop.y, w: crop.w, h: crop.h } : FULL);
  const [drag, setDrag] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /**
   * THE FRAME IS SIZED IN JS, NOT BY CSS `max-height`.
   *
   * The overlay rectangle is positioned in PERCENTAGES of the frame, so the
   * frame and the drawn image have to be the same box to the pixel — and the
   * CSS way of scaling an image up (a fixed height, or `object-contain` inside a
   * fixed box) letterboxes as soon as the proportions disagree, which silently
   * puts the selection somewhere other than where it was drawn. Measuring the
   * space and computing the drawn size keeps the two identical by construction,
   * and is what makes upscaling safe.
   */
  const plateRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });

  /**
   * A `ResizeObserver`, NOT A MEASUREMENT ON OPEN — and the difference is the
   * whole feature working or not.
   *
   * A `<dialog>` is `display: none` until `showModal()`, and that call lives in
   * its own effect below. Effects run in declaration order within one commit, so
   * measuring here on `open` reads the plate while it is still unrendered:
   * `clientWidth` is 0, the fallback floor takes over, and the picture is fitted
   * into 160px — wider dialog, same postage stamp. The observer fires when the
   * element actually has a size, whenever that is, which also covers the window
   * being resized with the cropper open.
   */
  useEffect(() => {
    const el = plateRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      // A closed dialog measures 0. That is "not measured yet", not "one pixel
      // wide" — `fitted` returns nothing for it and the image falls back to its
      // own size for the one render before the observer fires.
      const w = el.clientWidth - 32;
      setBox(
        w > 0
          ? { w, h: Math.max(240, Math.min(MAX_TALL, window.innerHeight - CHROME)) }
          : { w: 0, h: 0 },
      );
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    // A cached image can finish loading before React attaches `onLoad`, which
    // would leave the picture with no measured size for as long as the dialog is
    // open. `complete` is the answer to "did I miss the event".
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const size = fitted(natural, box);

  // Re-seed when the dialog is opened — the same adjust-during-render pattern
  // `ExportDialog` uses, rather than an effect that would fire mid-drag.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setRect(crop ? { x: crop.x, y: crop.y, w: crop.w, h: crop.h } : FULL);
      setDrag(null);
      setError("");
      setBusy(false);
    }
  }

  // `showModal()` is imperative and cannot be expressed as a prop — the same
  // reason `ConfirmDialog` and `LogoPicker` keep this effect.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const src = `/api/leads/asset/logos-thumb/${logo.sha}.webp`;
  const plate = PLATE_CLASS[logoPlate(logo.theme)];
  const live = drag ? rectOf(drag.from, drag.to) : rect;
  const usable = live.w >= MIN_SIDE && live.h >= MIN_SIDE;
  const whole = live.w > 0.999 && live.h > 0.999;

  /** Pointer position as a fraction of the image box. */
  const at = (e: React.PointerEvent): { x: number; y: number } => {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return { x: 0, y: 0 };
    return {
      x: (e.clientX - box.left) / box.width,
      y: (e.clientY - box.top) / box.height,
    };
  };

  async function apply() {
    const img = imgRef.current;
    if (!img || !usable) return;
    setBusy(true);
    setError("");
    try {
      // `decode()` rather than trusting `complete`: the element is rendered at a
      // CSS size and we are about to read `naturalWidth`, and a half-loaded
      // image reports 0 and would crop to a single pixel.
      await img.decode().catch(() => {});
      const file = await cut(img, live);
      if (!file) throw new Error("This browser could not produce the cropped image.");

      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "The cropped image could not be stored.");

      onOp({
        op: "logo.crop",
        orgId,
        crop: { sha: logo.sha, url: data.url, x: live.x, y: live.y, w: live.w, h: live.h },
      });
      onClose();
    } catch (e) {
      /**
       * NOTHING IS RECORDED WHEN THE UPLOAD FAILS, and the dialog stays open
       * saying so. A crop op naming a URL that was never written would render a
       * broken image on the card and ship a broken one to a church — the failure
       * has to stop here, where the selection is still on screen and the button
       * is still there to press again.
       */
      setError(e instanceof Error ? e.message : "The crop could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      // WIDE. The whole job here is a drag against the edge of a letterform, and
      // the dialog used to be the same 560px as the confirmations — which put a
      // 200px thumbnail on screen at 200px. See `MAX_UPSCALE`.
      // `max-h` + scroll because the picture is now sized to the viewport: on a
      // short window the plate would otherwise push the Crop button off the
      // bottom of a dialog that cannot be scrolled to reach it.
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(1000px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-lead-line bg-lead-panel p-0 text-lead-ink backdrop:bg-black/50"
    >
      <div className="p-5">
        <h2 className="font-serif text-[19px] leading-snug font-semibold text-lead-ink">
          Trim {churchName || "this logo"}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-lead-ink2">
          Drag a box over the part of the image to keep — a tagline, a phone number or a wide
          white margin around the mark. What you keep is what the demo is built with.
        </p>

        {/* THE PLATE IS THE ONE THE CARD USES. A near-white cut-out judged on a
            white background is a crop made blind, and the plate is exactly the
            thing `logoPlate` exists to decide. */}
        <div ref={plateRef} className={`mt-4 grid place-items-center rounded-lg p-4 ${plate}`}>
          <div
            ref={frameRef}
            // The frame IS the image's box — see the note on `plateRef`. Until
            // the picture has loaded there is no size to give it, and the img's
            // own intrinsic size stands in for one render.
            style={size.w ? { width: size.w, height: size.h } : undefined}
            onPointerDown={(e) => {
              if (busy) return;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              const p = at(e);
              setDrag({ from: p, to: p });
            }}
            onPointerMove={(e) => {
              if (drag) setDrag({ ...drag, to: at(e) });
            }}
            onPointerUp={() => {
              if (!drag) return;
              const next = rectOf(drag.from, drag.to);
              setDrag(null);
              // A click with no drag is not a crop to nothing — it is a click.
              if (next.w >= MIN_SIDE && next.h >= MIN_SIDE) setRect(next);
            }}
            className="relative max-w-full touch-none select-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNatural({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              // SMOOTHED, NOT PIXELATED. These thumbnails are 108×108, so the
              // preview is a 5–6× enlargement; hard pixel edges at that scale
              // read as a broken image rather than as precision, and the crop is
              // a rectangle over a shape, not over individual pixels.
              //
              // Before the load there is no measured box, so the image's own
              // size stands in for one render.
              className={size.w ? "block h-full w-full" : "block max-h-[320px] w-auto max-w-full"}
            />

            {/* WHAT IS BEING THROWN AWAY, DIMMED — four panels around the
                selection rather than a border on it. A border says "here is a
                box"; the dimming says "this is the picture you are about to
                send", which is the actual question. */}
            {!whole && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/45" style={{ height: `${live.y * 100}%` }} />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45"
                  style={{ height: `${(1 - live.y - live.h) * 100}%` }}
                />
                <div
                  className="pointer-events-none absolute left-0 bg-black/45"
                  style={{ top: `${live.y * 100}%`, height: `${live.h * 100}%`, width: `${live.x * 100}%` }}
                />
                <div
                  className="pointer-events-none absolute right-0 bg-black/45"
                  style={{
                    top: `${live.y * 100}%`,
                    height: `${live.h * 100}%`,
                    width: `${(1 - live.x - live.w) * 100}%`,
                  }}
                />
              </>
            )}
            <div
              className="pointer-events-none absolute border border-dashed border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
              style={{
                left: `${live.x * 100}%`,
                top: `${live.y * 100}%`,
                width: `${live.w * 100}%`,
                height: `${live.h * 100}%`,
              }}
            />
          </div>
        </div>

        {/* THE SIZE IN REAL PIXELS, not just the percentage. The source is a
            108×108 thumbnail — the same one the demo ships today — so a hard
            crop leaves a small picture, and that is a thing to know while the
            box is still being dragged rather than after the export. */}
        <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-lead-ink2">
          {whole
            ? "Nothing is trimmed yet — drag a box over the image."
            : usable
              ? `Keeping ${Math.round(live.w * 100)}% × ${Math.round(live.h * 100)}% — ${Math.round(
                  live.w * (natural.w || 0),
                )}×${Math.round(live.h * (natural.h || 0))} pixels of a ${natural.w}×${natural.h} image.`
              : "That selection is too small to send. Drag a bigger box."}
        </p>
        {/* The colours are measured from the whole mark, upstream, and cropping
            does not re-measure them. Said here because the palette block is on
            the card behind this dialog and would otherwise appear not to have
            noticed. */}
        <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-lead-ink2">
          The demo&rsquo;s colours are measured from the whole mark and do not change when you
          trim it.
        </p>

        {error && (
          <p className="mt-3 rounded-md border border-lead-bad/50 bg-lead-bad/[0.08] px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-lead-bad">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          {crop && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onOp({ op: "logo.crop", orgId, crop: null });
                onClose();
              }}
              className="mr-auto inline-flex h-9 items-center rounded-lg border border-lead-line bg-lead-panel px-3.5 font-mono text-[11px] text-lead-ink2 transition-colors hover:border-lead-ink2 hover:text-lead-ink disabled:opacity-45"
            >
              use the whole image
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-lead-line bg-lead-panel px-3.5 font-mono text-[11px] text-lead-ink2 transition-colors hover:border-lead-ink2 hover:text-lead-ink disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !usable || whole}
            onClick={() => void apply()}
            className="inline-flex h-9 items-center rounded-lg bg-lead-brand px-3.5 font-mono text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
          >
            {busy ? "saving…" : "Crop"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
