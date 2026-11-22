"""Saytni yig'adi: template.html + narxlar.json -> sayt/index.html (Netlify uchun) va preview.html (ko'rish uchun)."""
import json, shutil, pathlib
root = pathlib.Path(__file__).parent
tpl = (root / "template.html").read_text()
data = json.dumps(json.loads((root / "narxlar.json").read_text()), ensure_ascii=False, separators=(",", ":"))
page = tpl.replace("__DATA__", data)
(root / "preview.html").write_text(page)
head, body = page.split("<style>", 1)
full = f"""<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="order-endpoint" content="/.netlify/functions/order">
<link rel="icon" href="rasmlar/r.png">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
{head}<style>
:root {{ padding-top: env(safe-area-inset-top, 0px); }}
[hidden] {{ display: none !important; }}
img {{ max-width: 100%; }}
{body.split("</style>", 1)[0]}</style>
</head>
<body>
{body.split("</style>", 1)[1]}
<script>try {{ const tg = window.Telegram && Telegram.WebApp; if (tg && tg.initData !== undefined) {{ tg.ready(); tg.expand(); }} }} catch (e) {{}}</script>
</body>
</html>
"""
out = root / "sayt"
if out.exists(): shutil.rmtree(out)
shutil.copytree(root / "rasmlar", out / "rasmlar")
(out / "index.html").write_text(full)
print("tayyor:", out / "index.html")
