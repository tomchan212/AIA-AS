function frame(name, inner) {
  return `<div class="art art-${name}" aria-hidden="true">${inner}</div>`;
}

const guide = `
<svg viewBox="0 0 220 150" class="art-svg">
  <g class="float-a"><circle cx="34" cy="36" r="16" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/><text x="34" y="42" text-anchor="middle" font-size="16" font-weight="800" fill="#c0562a">$</text></g>
  <g class="float-b"><circle cx="186" cy="44" r="13" fill="#fff" stroke="#2d6a4f" stroke-width="3"/><text x="186" y="49" text-anchor="middle" font-size="14" font-weight="800" fill="#2d6a4f">$</text></g>
  <ellipse cx="110" cy="132" rx="42" ry="12" fill="#f0e2d2"/>
  <rect x="86" y="86" width="48" height="40" rx="18" fill="#c0562a"/>
  <circle cx="110" cy="64" r="24" fill="#ffd7b5" stroke="#2a211c" stroke-width="3"/>
  <circle cx="101" cy="62" r="2.4" fill="#2a211c"/>
  <circle cx="119" cy="62" r="2.4" fill="#2a211c"/>
  <path d="M100 74q10 8 20 0" fill="none" stroke="#c0562a" stroke-width="3" stroke-linecap="round"/>
  <g class="wave"><path d="M134 98q28-18 28-42" fill="none" stroke="#ffd7b5" stroke-width="8" stroke-linecap="round"/><circle cx="164" cy="52" r="8" fill="#ffd7b5" stroke="#2a211c" stroke-width="3"/></g>
</svg>`;

const wallet = `
<svg viewBox="0 0 120 90" class="art-svg">
  <rect x="14" y="24" width="92" height="52" rx="14" fill="#fff8f3" stroke="#c0562a" stroke-width="3"/>
  <path d="M14 40h92" stroke="#f0e2d2" stroke-width="3"/>
  <circle class="pulse" cx="84" cy="56" r="8" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/>
  <g class="float-a"><rect x="36" y="8" width="34" height="24" rx="6" fill="#fff" stroke="#2d6a4f" stroke-width="3"/><text x="53" y="25" text-anchor="middle" font-size="12" font-weight="800" fill="#2d6a4f">糧</text></g>
</svg>`;

const stack = `
<svg viewBox="0 0 120 90" class="art-svg">
  <g class="float-a"><rect x="28" y="18" width="64" height="16" rx="6" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/></g>
  <g class="float-b"><rect x="22" y="38" width="76" height="16" rx="6" fill="#fff" stroke="#2d6a4f" stroke-width="3"/></g>
  <rect x="16" y="58" width="88" height="18" rx="6" fill="#fff8f3" stroke="#2a211c" stroke-width="3"/>
</svg>`;

const coins = `
<svg viewBox="0 0 160 90" class="art-svg">
  <g class="drop"><circle cx="40" cy="28" r="16" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/><text x="40" y="34" text-anchor="middle" font-size="14" font-weight="800" fill="#c0562a">$</text></g>
  <g class="drop delay-1"><circle cx="80" cy="18" r="16" fill="#fff" stroke="#2d6a4f" stroke-width="3"/><text x="80" y="24" text-anchor="middle" font-size="14" font-weight="800" fill="#2d6a4f">$</text></g>
  <g class="drop delay-2"><circle cx="118" cy="30" r="16" fill="#ffd7b5" stroke="#c0562a" stroke-width="3"/><text x="118" y="36" text-anchor="middle" font-size="14" font-weight="800" fill="#c0562a">$</text></g>
  <ellipse cx="80" cy="74" rx="46" ry="10" fill="#f0e2d2"/>
</svg>`;

const piggy = `
<svg viewBox="0 0 120 90" class="art-svg">
  <ellipse cx="62" cy="52" rx="40" ry="26" fill="#ffd0d6" stroke="#2a211c" stroke-width="3"/>
  <ellipse cx="96" cy="56" rx="12" ry="9" fill="#ffb3be" stroke="#2a211c" stroke-width="3"/>
  <circle cx="48" cy="46" r="3" fill="#2a211c"/>
  <path d="M88 40v-12" stroke="#c0562a" stroke-width="3" stroke-linecap="round"/>
  <g class="float-a"><circle cx="88" cy="22" r="8" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/></g>
  <path d="M40 74v8M78 74v8" stroke="#2a211c" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const gate = `
<svg viewBox="0 0 120 90" class="art-svg">
  <path d="M18 78V28h84v50" fill="none" stroke="#2d6a4f" stroke-width="4"/>
  <path class="swing" d="M60 28v50" stroke="#2d6a4f" stroke-width="4"/>
  <circle cx="60" cy="22" r="8" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/>
  <text x="60" y="70" text-anchor="middle" font-size="13" font-weight="800" fill="#2d6a4f">免</text>
</svg>`;

const shield = `
<svg viewBox="0 0 88 88" class="art-svg">
  <path d="M44 8 74 20v24c0 20-14 30-30 36C28 74 14 64 14 44V20Z" fill="#e7f6ee" stroke="#2d6a4f" stroke-width="3"/>
  <path class="pulse" d="M44 28v28M30 42h28" stroke="#2d6a4f" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const future = `
<svg viewBox="0 0 88 88" class="art-svg">
  <circle cx="30" cy="58" r="14" fill="#ffd7b5" stroke="#2a211c" stroke-width="3"/>
  <circle cx="58" cy="34" r="16" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/>
  <path class="dash" d="M40 50c8-2 12-8 14-14" fill="none" stroke="#c0562a" stroke-width="3" stroke-linecap="round"/>
  <text x="58" y="39" text-anchor="middle" font-size="12" font-weight="800" fill="#c0562a">休</text>
</svg>`;

const vault = `
<svg viewBox="0 0 88 88" class="art-svg">
  <rect x="16" y="20" width="56" height="52" rx="10" fill="#fff8f3" stroke="#1a2744" stroke-width="3"/>
  <circle class="spin" cx="44" cy="46" r="14" fill="none" stroke="#c0562a" stroke-width="4" stroke-dasharray="18 10"/>
  <circle cx="44" cy="46" r="4" fill="#c0562a"/>
</svg>`;

const receipt = `
<svg viewBox="0 0 120 100" class="art-svg">
  <path d="M30 12h60v70l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-4 4V12Z" fill="#fff" stroke="#2a211c" stroke-width="3"/>
  <path d="M42 32h36M42 46h28M42 60h20" stroke="#f0e2d2" stroke-width="4" stroke-linecap="round"/>
  <g class="float-b"><circle cx="86" cy="24" r="12" fill="#ffe8a3" stroke="#c0562a" stroke-width="3"/><text x="86" y="29" text-anchor="middle" font-size="12" font-weight="800" fill="#c0562a">稅</text></g>
</svg>`;

const calm = `
<svg viewBox="0 0 120 100" class="art-svg">
  <circle cx="60" cy="50" r="28" fill="#e7f6ee" stroke="#2d6a4f" stroke-width="3"/>
  <path class="draw" d="M44 50l10 10 20-22" fill="none" stroke="#2d6a4f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SCENES = { guide, wallet, stack, coins, piggy, gate, shield, future, vault, receipt, calm };

export function art(name) {
  return frame(name, SCENES[name] || "");
}
