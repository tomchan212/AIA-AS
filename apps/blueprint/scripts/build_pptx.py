#!/usr/bin/env python3
"""17-page Mandy illustration deck, plus a year-by-year appendix."""

import json
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
YEARS = json.loads((ROOT / "src" / "years.json").read_text())
RATE = 7.85
OUT = [
    ROOT / "public" / "mandy.pptx",
    Path("/workspace/blueprint/mandy.pptx"),
]

BG = RGBColor(0xFA, 0xF8, 0xF5)
INK = RGBColor(0x1E, 0x29, 0x3B)
COCOA = RGBColor(0x78, 0x35, 0x0F)
BLUSH = RGBColor(0xFB, 0x71, 0x85)
YELLOW = RGBColor(0xFD, 0xE0, 0x47)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
PINK = RGBColor(0xFF, 0xE4, 0xE6)


def H(usd):
    return usd * RATE


def money(hkd):
    return f"HK$ {hkd:,.2f}"


def money0(hkd):
    return f"HK$ {hkd:,.0f}"


by_age = {row["age"]: row for row in YEARS}


def at(age):
    return by_age[age]


prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
W, HGT = prs.slide_width, prs.slide_height


def blank():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    fill = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, HGT)
    fill.line.fill.background()
    fill.fill.solid()
    fill.fill.fore_color.rgb = BG
    return slide


def set_run(paragraph, text, size, bold=False, color=INK, font="Microsoft JhengHei"):
    paragraph.clear()
    run = paragraph.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font
    return run


def textbox(slide, l, t, w, h, text, size=18, bold=False, color=INK, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    lines = str(text).split("\n")
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(2)
        set_run(p, line, size, bold, color)
    return box


def card(slide, l, t, w, h, fill=WHITE):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = INK
    shape.line.width = Pt(2.25)
    return shape


def mandy(slide, l, t, scale=1):
    s = scale
    face = slide.shapes.add_shape(MSO_SHAPE.OVAL, l, t, Inches(1.15 * s), Inches(1.15 * s))
    face.fill.solid()
    face.fill.fore_color.rgb = RGBColor(0xFF, 0xE4, 0xC4)
    face.line.color.rgb = INK
    face.line.width = Pt(2)
    hair = slide.shapes.add_shape(MSO_SHAPE.OVAL, l + Inches(0.08 * s), t - Inches(0.08 * s), Inches(1.0 * s), Inches(0.55 * s))
    hair.fill.solid()
    hair.fill.fore_color.rgb = INK
    hair.line.fill.background()
    for dx in (0.28, 0.72):
        eye = slide.shapes.add_shape(MSO_SHAPE.OVAL, l + Inches(dx * s), t + Inches(0.42 * s), Inches(0.12 * s), Inches(0.12 * s))
        eye.fill.solid()
        eye.fill.fore_color.rgb = INK
        eye.line.fill.background()
    for dx in (0.12, 0.88):
        cheek = slide.shapes.add_shape(MSO_SHAPE.OVAL, l + Inches(dx * s), t + Inches(0.58 * s), Inches(0.16 * s), Inches(0.12 * s))
        cheek.fill.solid()
        cheek.fill.fore_color.rgb = BLUSH
        cheek.line.fill.background()


def footer(slide, n):
    textbox(slide, Inches(0.4), Inches(7.05), Inches(10), Inches(0.3), "說明數字，不是保證，也不是要約。", 11, color=COCOA)
    textbox(slide, Inches(11.4), Inches(7.05), Inches(1.5), Inches(0.3), f"{n} / 17", 12, bold=True, align=PP_ALIGN.RIGHT)


# 1 cover
s = blank()
mandy(s, Inches(5.9), Inches(1.5), 1.8)
textbox(s, Inches(0.7), Inches(4.0), Inches(12), Inches(0.8), "財富累積與終身醫療說明", 36, True, align=PP_ALIGN.CENTER)
textbox(s, Inches(0.8), Inches(4.9), Inches(11.7), Inches(0.8), "CHAN MANDY：方案 A 每年 HK$ 23,550，兩張單接力\n方案 B 每年 HK$ 39,250，供 10 年，60 歲起按指定金額提取", 18, align=PP_ALIGN.CENTER)
card(s, Inches(3.6), Inches(6.15), Inches(6.1), Inches(0.55), YELLOW)
textbox(s, Inches(3.6), Inches(6.22), Inches(6.1), Inches(0.4), "2019 年 37 歲投保 · 建議書由 38 歲起算", 14, True, align=PP_ALIGN.CENTER)
footer(s, 1)

# 2 medical
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "醫療保費會隨年齡上升", 32, True)
textbox(s, Inches(0.5), Inches(1.1), Inches(12), Inches(0.6), "下面是先前列出的 AVF 普通房年保費，不是這三份儲蓄建議書裡的數字。", 16, color=COCOA)
points = [("37 歲", 7044.80), ("47 歲", 10689.60), ("60 歲", 14425.60), ("70 歲", 25001.60), ("80 歲", 43409.60)]
for i, (label, amount) in enumerate(points):
    left = Inches(0.5 + i * 2.5)
    card(s, left, Inches(2.2), Inches(2.3), Inches(2.2), WHITE if i % 2 == 0 else PINK)
    textbox(s, left, Inches(2.4), Inches(2.3), Inches(0.4), label, 16, True, align=PP_ALIGN.CENTER)
    textbox(s, left, Inches(3.0), Inches(2.3), Inches(0.8), money(amount), 18, True, align=PP_ALIGN.CENTER)
textbox(s, Inches(0.5), Inches(5.0), Inches(12), Inches(1.2), "如果退休後沒有一筆可以動用的錢，這些保費就要從生活開支裡付。\n儲蓄保單的作用，是先把錢滾大，再用提取出來的金額去付這張醫療保單。", 20)
footer(s, 2)

# 3 two engines
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "兩件事一起看", 32, True)
card(s, Inches(0.5), Inches(1.5), Inches(5.8), Inches(4.2), WHITE)
textbox(s, Inches(0.8), Inches(1.8), Inches(5.2), Inches(0.5), "自願醫保", 24, True, COCOA)
textbox(s, Inches(0.8), Inches(2.5), Inches(5.2), Inches(2.5), "用來付住院和手術的帳單。\n這裡用的是普通房的年保費。\n它每年要繳，而且會隨年齡增加。", 20)
card(s, Inches(6.8), Inches(1.5), Inches(5.8), Inches(4.2), YELLOW)
textbox(s, Inches(7.1), Inches(1.8), Inches(5.2), Inches(0.5), "盈御 3 儲蓄", 24, True, COCOA)
textbox(s, Inches(7.1), Inches(2.5), Inches(5.2), Inches(2.5), "把保費滾成退保發還金額。\n當中大部分是非保證的復歸紅利和終期分紅。\n提取之後還剩多少，這三份建議書沒有計算。", 20)
footer(s, 3)

# 4 plan A overview
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "方案 A：兩張單，一張供完再供下一張", 30, True)
textbox(s, Inches(0.5), Inches(1.2), Inches(12), Inches(0.8), "每張每年基本保費 3,000 美元，即 HK$ 23,550。各供 10 年。\n第一張建議書由 38 歲起算；第二張由 48 歲起算，不是 47 歲。", 18)
card(s, Inches(0.5), Inches(2.4), Inches(6), Inches(3.6), WHITE)
textbox(s, Inches(0.8), Inches(2.6), Inches(5.4), Inches(0.5), "第一張 · Plan A2", 22, True)
textbox(s, Inches(0.8), Inches(3.3), Inches(5.4), Inches(2.2), "38–47 歲，每年 HK$ 23,550\n10 年本金 HK$ 235,500\n47 歲退保發還金額 HK$ 247,604.70\n高過已繳的 30,000 美元", 20)
card(s, Inches(6.8), Inches(2.4), Inches(6), Inches(3.6), PINK)
textbox(s, Inches(7.1), Inches(2.6), Inches(5.4), Inches(0.5), "第二張 · Plan A1", 22, True)
textbox(s, Inches(7.1), Inches(3.3), Inches(5.4), Inches(2.2), "48–57 歲，每年 HK$ 23,550\n10 年本金 HK$ 235,500\n57 歲這張單自己的退保發還金額\n亦是 HK$ 247,604.70", 20)
footer(s, 4)

# 5 plan A milestones
s = blank()
textbox(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.6), "方案 A：兩張單加在一起", 32, True)
textbox(s, Inches(0.5), Inches(1.0), Inches(12), Inches(0.5), "同一年的兩個退保發還金額相加。匯率 1 美元 = 7.85 港元。", 16, color=COCOA)
items = [
    ("47 歲", "只有第一張", at(47)["aSurrenderUSD"]),
    ("57 歲", "第一張第 20 年 + 第二張第 10 年", at(57)["aSurrenderUSD"]),
    ("67 歲", "第一張第 30 年 + 第二張第 20 年", at(67)["aSurrenderUSD"]),
    ("77 歲", "第一張第 40 年 + 第二張第 30 年", at(77)["aSurrenderUSD"]),
    ("100 歲", "第一張第 63 年 + 第二張第 53 年", at(100)["aSurrenderUSD"]),
]
for i, (age, note, usd) in enumerate(items):
    top = Inches(1.6 + i * 1.0)
    card(s, Inches(0.5), top, Inches(12.3), Inches(0.9), WHITE if i % 2 == 0 else YELLOW)
    textbox(s, Inches(0.7), top + Inches(0.12), Inches(2), Inches(0.6), age, 20, True)
    textbox(s, Inches(2.8), top + Inches(0.18), Inches(5.5), Inches(0.55), note, 16)
    textbox(s, Inches(8.2), top + Inches(0.15), Inches(4.3), Inches(0.6), money(H(usd)), 22, True, align=PP_ALIGN.RIGHT)
footer(s, 5)

# 6 plan B overview
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "方案 B：一張單，供 10 年", 32, True)
card(s, Inches(0.5), Inches(1.4), Inches(7.4), Inches(4.8), WHITE)
textbox(s, Inches(0.8), Inches(1.6), Inches(6.8), Inches(4.2),
        "38–47 歲，每年基本保費 5,000 美元\n即 HK$ 39,250\n\n10 年本金 50,000 美元\n即 HK$ 392,500\n\n47 歲退保發還金額\n52,570 美元 = HK$ 412,674.50\n\n48 歲起這張單不再繳儲蓄保費。", 22)
card(s, Inches(8.2), Inches(1.4), Inches(4.6), Inches(4.8), YELLOW)
textbox(s, Inches(8.4), Inches(1.7), Inches(4.2), Inches(1), "比方案 A 少付的本金", 18, True)
textbox(s, Inches(8.4), Inches(2.8), Inches(4.2), Inches(1), money0(78500), 32, True, BLUSH)
textbox(s, Inches(8.4), Inches(4.2), Inches(4.2), Inches(1.4), "471,000 − 392,500\n= 78,500", 18)
footer(s, 6)

# 7 withdrawal schedule
s = blank()
textbox(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.6), "方案 B：60 歲起的提取節奏", 32, True)
textbox(s, Inches(0.5), Inches(1.0), Inches(12), Inches(0.5), "這是指定的領錢方式。Plan B 建議書假設全程沒有提取，所以沒有「領完還剩多少」。", 16, color=COCOA)
bands = [("60–63 歲", "每年 HK$ 23,550", "4 年"), ("64–74 歲", "每年 HK$ 39,250", "11 年"), ("75–82 歲", "每年 HK$ 54,950", "8 年"), ("83–100 歲", "每年 HK$ 70,650", "18 年")]
for i, (a, b, c) in enumerate(bands):
    left = Inches(0.4 + i * 3.2)
    card(s, left, Inches(1.8), Inches(3.0), Inches(2.6), WHITE if i % 2 == 0 else PINK)
    textbox(s, left + Inches(0.15), Inches(2.0), Inches(2.7), Inches(0.5), a, 18, True, align=PP_ALIGN.CENTER)
    textbox(s, left + Inches(0.15), Inches(2.6), Inches(2.7), Inches(0.8), b, 18, True, align=PP_ALIGN.CENTER)
    textbox(s, left + Inches(0.15), Inches(3.5), Inches(2.7), Inches(0.5), c, 16, align=PP_ALIGN.CENTER)
textbox(s, Inches(0.5), Inches(4.8), Inches(12), Inches(1.6), "四段自己加總是 HK$ 2,237,250。\n若寫成 227 萬或 HK$ 2,276,500，會多出大約一年的 HK$ 39,250。簡報用四段加總。", 20)
footer(s, 7)

# 8 offset at 60
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "60 歲這一年：提取金額高於列出的醫保保費", 28, True)
card(s, Inches(0.6), Inches(1.5), Inches(5.6), Inches(3.2), WHITE)
textbox(s, Inches(0.8), Inches(1.7), Inches(5.2), Inches(0.5), "AVF 普通房", 20, True, COCOA)
textbox(s, Inches(0.8), Inches(2.5), Inches(5.2), Inches(1), money(14425.60), 32, True)
card(s, Inches(6.8), Inches(1.5), Inches(5.8), Inches(3.2), YELLOW)
textbox(s, Inches(7.0), Inches(1.7), Inches(5.4), Inches(0.5), "方案 B 提取", 20, True, COCOA)
textbox(s, Inches(7.0), Inches(2.5), Inches(5.4), Inches(1), money(23550), 32, True)
textbox(s, Inches(0.6), Inches(5.0), Inches(12), Inches(1.4), "23,550 − 14,425.60 = 9,124.40。這一年提取金額付完列出的保費後，還剩 HK$ 9,124.40。\n這不代表往後每一年都夠。100 歲若仍領 HK$ 70,650，而保費是 HK$ 85,424.80，就差 HK$ 14,774.80。", 18)
footer(s, 8)

# 9 no-withdrawal values
s = blank()
textbox(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.7), "方案 B 如果不提取，建議書上的退保發還金額", 28, True)
textbox(s, Inches(0.5), Inches(1.1), Inches(12), Inches(0.6), "這些數字假設沒有提錢。不能把它們當成「領走養老金之後的餘額」。", 16, color=COCOA)
for i, age in enumerate((47, 57, 65, 75, 85, 100)):
    row = at(age)
    left = Inches(0.4 + (i % 3) * 4.2)
    top = Inches(1.9 + (i // 3) * 2.3)
    card(s, left, top, Inches(4.0), Inches(2.1), WHITE)
    textbox(s, left + Inches(0.2), top + Inches(0.15), Inches(3.6), Inches(0.4), f"{age} 歲", 18, True)
    textbox(s, left + Inches(0.2), top + Inches(0.7), Inches(3.6), Inches(0.9), money(H(row["bSurrenderUSD"])), 22, True)
footer(s, 9)

# 10 pocket
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "前 10 年，每年要拿出多少", 32, True)
card(s, Inches(0.5), Inches(1.6), Inches(6), Inches(4), WHITE)
textbox(s, Inches(0.8), Inches(1.9), Inches(5.4), Inches(0.5), "方案 A", 24, True)
textbox(s, Inches(0.8), Inches(2.7), Inches(5.4), Inches(2), "每年 HK$ 23,550\n大約每月 HK$ 1,962", 24)
card(s, Inches(6.8), Inches(1.6), Inches(6), Inches(4), PINK)
textbox(s, Inches(7.1), Inches(1.9), Inches(5.4), Inches(0.5), "方案 B", 24, True)
textbox(s, Inches(7.1), Inches(2.7), Inches(5.4), Inches(2), "每年 HK$ 39,250\n大約每月 HK$ 3,271", 24)
textbox(s, Inches(0.5), Inches(5.9), Inches(12), Inches(0.8), "相差 HK$ 15,700 一年，大約每月 HK$ 1,308。這只算儲蓄保費，未計醫保。", 20)
footer(s, 10)

# 11 principal
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "總共放入的儲蓄本金", 32, True)
card(s, Inches(0.6), Inches(1.6), Inches(5.8), Inches(3.5), WHITE)
textbox(s, Inches(0.8), Inches(1.8), Inches(5.4), Inches(0.5), "方案 A", 22, True)
textbox(s, Inches(0.8), Inches(2.6), Inches(5.4), Inches(1.8), "23,550 × 20 年\n= HK$ 471,000", 26, True)
card(s, Inches(6.8), Inches(1.6), Inches(5.8), Inches(3.5), YELLOW)
textbox(s, Inches(7.0), Inches(1.8), Inches(5.4), Inches(0.5), "方案 B", 22, True)
textbox(s, Inches(7.0), Inches(2.6), Inches(5.4), Inches(1.8), "39,250 × 10 年\n= HK$ 392,500", 26, True)
textbox(s, Inches(0.6), Inches(5.4), Inches(12), Inches(1), "方案 B 少付 HK$ 78,500。建議書另有保費徵費：A 每張每年約 3.05 美元，B 的年繳總保費欄是 5,005.05 美元。上面的本金用基本保費 3,000 和 5,000 美元。", 16)
footer(s, 11)

# 12 long comparison no withdrawal
s = blank()
textbox(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.6), "若全程不提取，兩邊的退保發還金額", 30, True)
rows_show = [(47, "A 只有第一張"), (57, "A 兩張相加"), (67, "A 兩張相加"), (100, "A 兩張相加")]
textbox(s, Inches(0.5), Inches(1.1), Inches(4), Inches(0.4), "年齡", 16, True)
textbox(s, Inches(3.2), Inches(1.1), Inches(4.5), Inches(0.4), "方案 A", 16, True)
textbox(s, Inches(8.2), Inches(1.1), Inches(4.5), Inches(0.4), "方案 B", 16, True)
for i, (age, note) in enumerate(rows_show):
    row = at(age)
    top = Inches(1.6 + i * 1.2)
    card(s, Inches(0.4), top, Inches(12.5), Inches(1.05), WHITE if i % 2 == 0 else PINK)
    textbox(s, Inches(0.6), top + Inches(0.25), Inches(2.4), Inches(0.5), f"{age} 歲", 20, True)
    textbox(s, Inches(3.0), top + Inches(0.15), Inches(4.6), Inches(0.75), f"{money(H(row['aSurrenderUSD']))}\n{note}", 16)
    textbox(s, Inches(8.0), top + Inches(0.25), Inches(4.6), Inches(0.5), money(H(row["bSurrenderUSD"])), 20, True)
footer(s, 12)

# 13 split
s = blank()
textbox(s, Inches(0.5), Inches(0.4), Inches(12), Inches(0.7), "保單可以分拆", 32, True)
textbox(s, Inches(0.5), Inches(1.5), Inches(12), Inches(4), "由第 3 個保單年度終結後，或供款期完結後，以較後者為準，可以申請把一部分保單價值分到另一張保單。\n\n分拆要公司核准。分出來的保單，生效日跟原來那張一樣。\n\n這是產品簡介裡的安排，不是這三份建議書已經辦好的事。", 24)
footer(s, 13)

# 14 lock
s = blank()
textbox(s, Inches(0.5), Inches(0.4), Inches(12), Inches(0.7), "紅利可以鎖定，也可以解鎖", 32, True)
textbox(s, Inches(0.5), Inches(1.5), Inches(12), Inches(4.5), "由第 15 個保單年度終結後起，每個年度終結後 30 日內可鎖定一次。\n\n轉到鎖定戶口的復歸紅利和終期分紅，百分比要一樣，不可低於 10%，也不可高於 70%。鎖定戶口的利息不是保證。\n\n鎖定滿一年之後可以解鎖，比例是 10% 至 100%。解鎖和鎖定都會改變以後的非保證金額。", 24)
footer(s, 14)

# 15 incapacity and grace
s = blank()
textbox(s, Inches(0.5), Inches(0.35), Inches(12), Inches(0.6), "兩項應急安排", 32, True)
card(s, Inches(0.4), Inches(1.3), Inches(6.2), Inches(5), WHITE)
textbox(s, Inches(0.6), Inches(1.5), Inches(5.8), Inches(0.5), "精神上無行為能力", 22, True)
textbox(s, Inches(0.6), Inches(2.2), Inches(5.8), Inches(3.6), "由第 3 個保單年度終結後起，可預先指定一名 18 歲或以上的家人，以及保單價值的 10% 至 100%。\n\n每份保單只付一次，要公司批准，付了會減少保單價值。", 18)
card(s, Inches(6.8), Inches(1.3), Inches(6.1), Inches(5), YELLOW)
textbox(s, Inches(7.0), Inches(1.5), Inches(5.7), Inches(0.5), "延繳保費", 22, True)
textbox(s, Inches(7.0), Inches(2.2), Inches(5.7), Inches(3.6), "只適用 3 年、5 年及 10 年供款。\n所以只對方案 B 這張 10 年供款的保單，不對供 20 年節奏的兩張方案 A。\n\n指定情況包括被裁、結婚、離婚、子女出生或領養、買入住宅、更改主要居住地。每份保單只可申請一次，寬限期最多 365 日。", 18)
footer(s, 15)

# 16 change insured
s = blank()
textbox(s, Inches(0.5), Inches(0.4), Inches(12), Inches(0.7), "可以更換受保人", 32, True)
textbox(s, Inches(0.5), Inches(1.4), Inches(12), Inches(4.5), "由第 1 個保單年度終結後起，受保人在生時，可申請無限次更改受保人，也可以指定第二受保人。要公司批准，並符合當時的年齡和可保利益規則。\n\n卓越成績獎最高一項，是獲產品簡介所指的全球大學排名首 10 位取錄，獎金 2,800 美元，約 HK$ 21,980（按 7.85）。同一位受保人的所有盈御 3 保單只付一次。\n\n這不是免遺產認證的承諾。實際能不能這樣過戶，要看當時的保單條款和適用法律。", 22)
footer(s, 16)

# 17 close
s = blank()
textbox(s, Inches(0.5), Inches(0.3), Inches(12), Inches(0.6), "怎樣看這兩套安排", 32, True)
card(s, Inches(0.4), Inches(1.2), Inches(6.2), Inches(5.2), WHITE)
textbox(s, Inches(0.6), Inches(1.4), Inches(5.8), Inches(0.5), "方案 A 較接近的情況", 20, True)
textbox(s, Inches(0.6), Inches(2.1), Inches(5.8), Inches(3.8), "想每年少付 HK$ 15,700。\n可以接受供款分成兩段，直到 57 歲。\n不打算從戶口提錢。\n100 歲兩張單合計的退保發還金額，在建議書上是 HK$ 14,592,718.25。", 18)
card(s, Inches(6.8), Inches(1.2), Inches(6.1), Inches(5.2), YELLOW)
textbox(s, Inches(7.0), Inches(1.4), Inches(5.7), Inches(0.5), "方案 B 較接近的情況", 20, True)
textbox(s, Inches(7.0), Inches(2.1), Inches(5.7), Inches(3.8), "想 47 歲後不再繳這張儲蓄保單。\n本金少 HK$ 78,500。\n60 歲後按四段金額用錢。\n建議書沒有算出提取後還剩多少；不提取的話，100 歲是 HK$ 15,880,871.85。", 18)
footer(s, 17)

def cell_text(cell, text, size=10, bold=False, align=PP_ALIGN.RIGHT):
    cell.text = ""
    p = cell.text_frame.paragraphs[0]
    p.alignment = align
    set_run(p, text, size, bold)
    cell.margin_left = Inches(0.05)
    cell.margin_right = Inches(0.05)
    cell.margin_top = Inches(0.02)
    cell.margin_bottom = Inches(0.02)


# appendix: every year, as a table so the columns stay lined up
chunk = 16
headers = ["年齡", "年份", "A 年保費", "A 退保發還", "B 年保費", "B 退保發還（不提取）", "B 提取"]
for start in range(0, len(YEARS), chunk):
    part = YEARS[start:start + chunk]
    s = blank()
    textbox(s, Inches(0.3), Inches(0.12), Inches(12), Inches(0.36), f"附錄 · 每一年（{part[0]['age']}–{part[-1]['age']} 歲）", 20, True)
    textbox(s, Inches(0.3), Inches(0.48), Inches(12.5), Inches(0.28), "港元 = 美元 × 7.85。退保發還金額含非保證紅利。方案 B 的退保欄假設沒有提取。", 12, color=COCOA)
    table_shape = s.shapes.add_table(len(part) + 1, len(headers), Inches(0.28), Inches(0.85), Inches(12.75), Inches(6.05))
    table = table_shape.table
    widths = [0.9, 1.1, 1.7, 2.15, 1.7, 2.7, 1.7]
    for i, width in enumerate(widths):
        table.columns[i].width = Inches(width)
    for i, label in enumerate(headers):
        cell = table.cell(0, i)
        cell_text(cell, label, 11, True, PP_ALIGN.CENTER)
        cell.fill.solid()
        cell.fill.fore_color.rgb = YELLOW
    table.rows[0].height = Inches(0.32)
    for r, row in enumerate(part, start=1):
        table.rows[r].height = Inches(0.30)
        values = [
            str(row["age"]),
            str(row["year"]),
            money(H(row["aPremiumUSD"])),
            money(H(row["aSurrenderUSD"])),
            money(H(row["bPremiumUSD"])),
            money(H(row["bSurrenderUSD"])),
            money(row["withdrawalHKD"]),
        ]
        for c, value in enumerate(values):
            cell = table.cell(r, c)
            cell_text(cell, value, 11, False, PP_ALIGN.CENTER if c < 2 else PP_ALIGN.RIGHT)
            cell.fill.solid()
            cell.fill.fore_color.rgb = WHITE if r % 2 else PINK

assert abs(H(at(47)["aSurrenderUSD"]) - 247604.70) < 0.01
assert abs(H(at(57)["aSurrenderUSD"]) - 761434.30) < 0.01
assert abs(H(at(100)["aSurrenderUSD"]) - 14592718.25) < 0.01
assert abs(H(at(47)["bSurrenderUSD"]) - 412674.50) < 0.01
assert abs(H(at(100)["bSurrenderUSD"]) - 15880871.85) < 0.01
assert YEARS[-1]["cumulativeWithdrawalHKD"] == 2237250
assert YEARS[0]["age"] == 38 and YEARS[-1]["age"] == 100
assert len(YEARS) == 63

for path in OUT:
    path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(path)
    print("wrote", path, "slides", len(prs.slides))
