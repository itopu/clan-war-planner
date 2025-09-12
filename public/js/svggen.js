const GHOST_OPTS = { width: 140, height: 56, maxChars: 16 };
const DRAG_HOTSPOT = { x: 24, y: 28 };     // setDragImage offset

async function prepareItemDragGhost($memberTag, attackerName) {
  const fontsReady = document.fonts ? document.fonts.ready.catch(() => { }) : Promise.resolve();

  // 1) ফন্ট প্রস্তুত (যদি প্রযোজ্য)
  await fontsReady;

  // 2) SVG→Image বানাই এবং লোড/ডিকোড শেষ না হওয়া পর্যন্ত draggable দেই না
  const img = new Image();
  img.decoding = "sync";             // হিন্ট (সব ব্রাউজারে না-ও কাজ করতে পারে)
  const url = makeFlagSVGDataURL(attackerName, GHOST_OPTS);

  // Promise: onload শেষে decode() চেষ্টা
  await new Promise((resolve) => {
    img.onload = async () => {
      try { if (img.decode) await img.decode(); } catch (_) { }
      resolve();
    };
    img.src = url;
  });

  // 3) কিছু ব্রাউজারে ক্যাশ স্টেবল করতে অফস্ক্রিনে এক মুহূর্ত ধরে রাখা ভাল
  img.setAttribute("data-member-tag", $memberTag);
  img.style.position = "absolute";
  img.style.left = "-9999px";
  img.style.top = "-9999px";
  img.style.width = "48px";
  img.style.height = "58px";
  document.body.appendChild(img);

  // 4) ডেটা-স্টোর ও enable drag
  const itemElement = $("#war-bases-container").find('.war-participator-item .item[data-attacker-tag="'+$memberTag+'"]');
  // itemElement.attr("data-ghost-img", $(img));
}

// নামসহ ডায়নামিক SVG → data URL
function makeFlagSVGDataURL(name, opts = {}) {
  const pad = 8;
  const w = opts.width || 140; // মোট প্রস্থ
  const h = opts.height || 56;  // মোট উচ্চতা
  const flagColor = opts.flagColor || "#FDE047"; // amber-300
  const poleColor = opts.poleColor || "#9CA3AF"; // gray-400
  const textColor = opts.textColor || "#111827"; // gray-900
  const fontFamily = opts.fontFamily || "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";

  // নাম খুব লম্বা হলে ট্রিম
  const maxChars = opts.maxChars || 16;
  let label = (name || "").toString();
  if (label.length > maxChars) label = label.slice(0, maxChars - 1) + "…";

  // SVG বানাই
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <!-- pole -->
    <rect x="${pad / 2}" y="${pad / 2}" width="6" height="${h - pad}" rx="3" fill="${poleColor}"/>
    <!-- flag shape -->
    <path d="
      M ${pad + 6} ${pad}
      L ${w - pad} ${pad + 6}
      L ${pad + 6} ${h - pad}
      Z
    " fill="${flagColor}" />

    <!-- subtle stroke -->
    <path d="
      M ${pad + 6} ${pad}
      L ${w - pad} ${pad + 6}
      L ${pad + 6} ${h - pad}
      Z
    " fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>

    <!-- text -->
    <g font-family="${fontFamily}" font-size="14" font-weight="700" fill="${textColor}">
      <text x="${pad + 14}" y="${h / 2.5}" dominant-baseline="middle">${escapeHtml(label)}</text>
    </g>
  </svg>`;

  // data URL এ কনভার্ট
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// HTML escape (নামে < > & etc. থাকলে)
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])
  );
}
