#!/usr/bin/env python3
"""Składa src/*.js + src/head.html w jeden samodzielny plik index.html."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
js = "\n".join((src / n).read_text(encoding="utf-8") for n in ["catalog.js", "furniture.js", "house.js", "build.js", "app.js"])
html = (src / "head.html").read_text(encoding="utf-8").replace("/*__JS__*/", js)
(root / "index.html").write_text(html, encoding="utf-8")
print("OK ->", root / "index.html", len(html) // 1024, "KB")
