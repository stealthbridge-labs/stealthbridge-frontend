#!/usr/bin/env python3
"""Generate src/app/app-light.css: legacy screens mapped onto the canonical design tokens.

The public site keeps the dark brand in src/app/globals.css. Inside the
authenticated app (.sb-app) and on sign-in (.sb-light) the product is light.
Legacy components that haven't been rebuilt on the sb- primitives still use
globals.css classes, so this script re-emits ONLY their colour declarations,
lightness-inverted, under those two scopes. Layout and spacing are untouched.

    python3 scripts/generate-app-light-css.py          # write
    python3 scripts/generate-app-light-css.py --check  # CI: fail if stale
"""
import colorsys
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/app/globals.css"
OUT = ROOT / "src/app/app-light.css"
SCOPES = (".sb-app", ".sb-light")

HEX = re.compile(r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
RGBA = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)")
COLOR = re.compile(HEX.pattern + "|" + RGBA.pattern)


def parse_hex(h):
    h = h[1:]
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return r, g, b, (int(h[6:8], 16) / 255 if len(h) == 8 else None)


def hue_family(h, s):
    """Classify a colour by hue when it is saturated enough to carry meaning."""
    if s < 0.22:
        return "neutral"
    deg = h * 360
    if deg < 22 or deg >= 335:
        return "danger"
    if deg < 65:
        return "warning"
    if deg < 205:
        return "brand"  # greens, teals, mint
    if deg < 265:
        return "info"
    return "neutral"


def token_for(prop, r, g, b, a=None):
    """Map a legacy (dark-theme) colour to a canonical design token by role.

    Lightness is inverted first (dark theme -> light), then the colour is snapped
    to the token that plays the same role, so the generated theme introduces no
    colours of its own (design-system.css is the single source of truth).
    """
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    light = 1 - l  # lightness in the light theme
    family = hue_family(h, s)
    faint = a is not None and a < 0.35
    # On the old dark theme, near-white mint was ordinary body/heading text and
    # faint mint washes/borders were neutral surfaces: keep them neutral here.
    if family == "brand" and (l > 0.8 or faint):
        family = "neutral"
    # Very dark tinted colours were the navy ink of the old theme (e.g. text on
    # mint buttons): neutral, so they invert to white on accent fills.
    if l < 0.22:
        family = "neutral"
    # Card washes and accent borders become neutral surfaces and lines; the
    # accent is reserved for text, icons and solid fills.
    if family == "brand" and (prop.startswith("background-image") or prop.startswith("border") or prop.startswith("outline")):
        family = "neutral"
    if prop.startswith("background") or prop in ("fill",):
        if family != "neutral":
            return f"var(--sb-{family}-soft)" if light > 0.62 else f"var(--sb-{family})"
        if prop.startswith("background-image") and light > 0.55:
            return "var(--sb-surface)"  # legacy card washes become plain white cards
        if light > 0.95:
            return "var(--sb-surface)"
        if light > 0.88:
            return "var(--sb-surface-2)"
        if light > 0.55:
            return "var(--sb-surface-3)"
        return "var(--sb-ink)"
    if prop.startswith("border") or prop.startswith("outline") or prop in ("column-rule", "text-decoration-color", "caret-color", "accent-color"):
        if family != "neutral":
            return f"var(--sb-{family})"
        return "var(--sb-line-strong)" if light < 0.8 else "var(--sb-line)"
    # text-like: color, stroke, -webkit-text-fill-color, custom properties
    if family != "neutral":
        return f"var(--sb-{family})"
    if light > 0.88:
        return "var(--sb-surface)"  # text that sat on dark fills
    if light < 0.3:
        return "var(--sb-ink)"
    if light < 0.5:
        return "var(--sb-ink-2)"
    return "var(--sb-ink-3)"


def with_alpha(token, a):
    if a is None or a >= 0.995:
        return token
    return f"color-mix(in srgb, {token} {round(a * 100, 1)}%, transparent)"


def transform(prop, value):
    shadow = "shadow" in prop

    def color(r, g, b, a):
        if shadow:
            return "rgba(15,28,36,%.3g)" % max(0.04, min(0.16, (1 if a is None else a) * 0.2))
        return with_alpha(token_for(prop, r, g, b, a), a)

    def hex_sub(m):
        return color(*parse_hex(m.group(0)))

    def rgba_sub(m):
        r, g, b = (int(m.group(i)) / 255 for i in (1, 2, 3))
        return color(r, g, b, float(m.group(4)) if m.group(4) else None)

    parts = re.split(r"(url\([^)]*\))", value)  # never touch data: URIs
    return "".join(p if p.startswith("url(") else RGBA.sub(rgba_sub, HEX.sub(hex_sub, p)) for p in parts)


def blocks(css):
    """Yield (prelude, body) for each top-level block, matching braces."""
    i, n = 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            return
        depth, k = 1, j + 1
        while k < n and depth:
            depth += {"{": 1, "}": -1}.get(css[k], 0)
            k += 1
        yield css[i:j].strip(), css[j + 1:k - 1]
        i = k


def scope_selector(sel):
    out = []
    for part in (p.strip() for p in sel.split(",")):
        if not part:
            continue
        if part in (":root", "html", "body", "*"):
            out.extend(SCOPES)
        elif re.match(r"^(html|body)\b", part) or "::selection" in part:
            continue
        else:
            out.extend(f"{s} {part}" for s in SCOPES)
    return ",".join(out)


def rule(prelude, body):
    decls = []
    for d in body.split(";"):
        if ":" not in d:
            continue
        prop, value = d.split(":", 1)
        prop = prop.strip()
        if COLOR.search(value):
            role = prop
            if prop.startswith("--"):
                role = "background" if re.search(r"bg|panel|surface|card", prop) else ("border" if "line" in prop else "color")
            if role.startswith("background") and "gradient(" in value:
                role = "background-image"
            decls.append(f"{prop}:{transform(role, value.strip())}")
    if not decls:
        return ""
    sel = scope_selector(prelude)
    return f"{sel}{{{';'.join(decls)}}}\n" if sel else ""


def convert(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out = []
    for prelude, body in blocks(css):
        if prelude.startswith("@keyframes") or prelude.startswith("@font-face") or prelude.startswith("@theme"):
            continue
        if prelude.startswith("@media") or prelude.startswith("@supports") or prelude.startswith("@layer"):
            inner = "".join(rule(p, b) for p, b in blocks(body) if not p.startswith("@"))
            if inner:
                out.append(f"{prelude}{{\n{inner}}}\n")
        elif not prelude.startswith("@"):
            out.append(rule(prelude, body))
    header = ("/* GENERATED by scripts/generate-app-light-css.py from globals.css. Do not edit.\n"
              "   Light colours for legacy screens inside the app (.sb-app) and sign-in (.sb-light). */\n")
    return header + "".join(out)


def main():
    css = SRC.read_text(encoding="utf8")
    css = css.split("\n", 1)[1] if css.startswith("@import") else css
    result = convert(css)
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf8") != result:
            print("app-light.css is stale: run python3 scripts/generate-app-light-css.py")
            sys.exit(1)
        print("app-light.css is up to date")
        return
    OUT.write_text(result, encoding="utf8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(result):,} bytes)")


if __name__ == "__main__":
    main()
