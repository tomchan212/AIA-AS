#!/usr/bin/env python3
"""Mandy deck: HKD premiums, withdrawals, and surrender charts."""

import json
from pathlib import Path

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
YEARS = json.loads((ROOT / "src" / "years.json").read_text())
OUT = [ROOT / "public" / "mandy.pptx", Path("/workspace/blueprint/mandy.pptx")]
STORY = 14

BG = RGBColor(0xFA, 0xF8, 0xF5)
INK = RGBColor(0x1E, 0x29, 0x3B)
COCOA = RGBColor(0x78, 0x35, 0x0F)
BLUSH = RGBColor(0xFB, 0x71, 0x85)
YELLOW = RGBColor(0xFD, 0xE0, 0x47)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
PINK = RGBColor(0xFF, 0xE4, 0xE6)

by_age = {row["age"]: row for row in YEARS}


def at(age):
    return by_age[age]


def money(hkd):
    return f"HK$ {hkd:,.2f}"


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
    for i, line in enumerate(str(text).split("\n")):
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


def footer(slide, n):
    textbox(slide, Inches(0.35), Inches(7.08), Inches(10.5), Inches(0.28), "說明數字，不是保證，也不是要約。港元 = 美元 × 7.85。", 11, color=COCOA)
    textbox(slide, Inches(11.2), Inches(7.08), Inches(1.7), Inches(0.28), f"{n} / {STORY}", 12, True, align=PP_ALIGN.RIGHT)


def add_chart(slide, chart_type, categories, series, l, t, w, h):
    data = CategoryChartData()
    data.categories = [str(item) for item in categories]
    for name, values in series:
        data.add_series(name, values)
    chart = slide.shapes.add_chart(chart_type, l, t, w, h, data).chart
    chart.has_legend = True
    chart.legend.include_in_layout = False
    return chart


ages = [row["age"] for row in YEARS]
pay_ages = [row["age"] for row in YEARS if row["age"] <= 57]
wd_rows = [row for row in YEARS if row["age"] >= 60]

# 1 cover
s = blank()
textbox(s, Inches(0.6), Inches(1.6), Inches(12), Inches(1), "盈御 3 與自願醫保說明", 36, True, align=PP_ALIGN.CENTER)
textbox(s, Inches(0.8), Inches(2.8), Inches(11.7), Inches(1.8), "方案 A：兩張盈御 3，儲蓄保費每年 HK$ 24,000，供 20 年\n方案 B：一張盈御 3，儲蓄保費每年 HK$ 39,000，供 10 年\n兩邊都另加同一列醫療保費，並由 60 歲起按現金提取舉例領錢", 20, align=PP_ALIGN.CENTER)
card(s, Inches(3.5), Inches(5.2), Inches(6.3), Inches(0.6), YELLOW)
textbox(s, Inches(3.5), Inches(5.3), Inches(6.3), Inches(0.4), "CHAN MANDY · 2019 年 37 歲投保 · 表由 38 歲起算", 14, True, align=PP_ALIGN.CENTER)
footer(s, 1)

# 2 structure
s = blank()
textbox(s, Inches(0.4), Inches(0.3), Inches(12), Inches(0.55), "方案 A 是兩張單，方案 B 是一張單", 28, True)
for i, (title, body, fill) in enumerate((
    ("方案 A2", "10 年繳。第 1 年是 38 歲。\n基本保費每年 3,000 美元。", WHITE),
    ("方案 A1", "10 年繳。第 1 年是 48 歲。\n48 歲之前這張單還未開始。", YELLOW),
    ("方案 B", "10 年繳。第 1 年是 38 歲。\n基本保費每年 5,000 美元。", PINK),
)):
    left = Inches(0.4 + i * 4.25)
    card(s, left, Inches(1.2), Inches(4.0), Inches(3.2), fill)
    textbox(s, left + Inches(0.2), Inches(1.4), Inches(3.6), Inches(0.5), title, 22, True)
    textbox(s, left + Inches(0.2), Inches(2.1), Inches(3.6), Inches(2), body, 18)
textbox(s, Inches(0.4), Inches(4.7), Inches(12.4), Inches(1.8), "圖上的儲蓄保費用總表的港元整數：方案 A 每年 HK$ 24,000，方案 B 每年 HK$ 39,000。\n建議書按 7.85 計是 HK$ 23,550 和 HK$ 39,250。\n儲蓄本金方案 A HK$ 480,000，方案 B HK$ 390,000，相差 HK$ 90,000。", 18)
footer(s, 2)

# 3 savings chart
s = blank()
textbox(s, Inches(0.4), Inches(0.25), Inches(12), Inches(0.45), "每年儲蓄保費", 28, True)
textbox(s, Inches(0.4), Inches(0.75), Inches(12), Inches(0.3), "方案 A 供到 57 歲。方案 B 供到 47 歲。", 14, color=COCOA)
add_chart(s, XL_CHART_TYPE.COLUMN_CLUSTERED, pay_ages, [
    ("方案 A 儲蓄", [row["aSavings"] for row in YEARS if row["age"] <= 57]),
    ("方案 B 儲蓄", [row["bSavings"] for row in YEARS if row["age"] <= 57]),
], Inches(0.4), Inches(1.15), Inches(12.5), Inches(5.7))
footer(s, 3)

# 4 medical
s = blank()
textbox(s, Inches(0.4), Inches(0.25), Inches(12), Inches(0.45), "醫療保費", 28, True)
textbox(s, Inches(0.4), Inches(0.75), Inches(12), Inches(0.3), "兩份總表同一列。38 歲 HK$ 6,056.80，100 歲 HK$ 85,424.80，合計 HK$ 2,343,128.80。", 14, color=COCOA)
add_chart(s, XL_CHART_TYPE.LINE, ages, [("醫療保費", [row["medical"] for row in YEARS])], Inches(0.4), Inches(1.15), Inches(12.5), Inches(5.7))
footer(s, 4)

# 5 annual paid
s = blank()
textbox(s, Inches(0.4), Inches(0.25), Inches(12), Inches(0.45), "每年一共要繳多少", 28, True)
textbox(s, Inches(0.4), Inches(0.75), Inches(12), Inches(0.35), f"47 歲 A {money(at(47)['aPaid'])}，B {money(at(47)['bPaid'])}。100 歲 A {money(at(100)['aPaid'])}，B {money(at(100)['bPaid'])}。", 14, color=COCOA)
add_chart(s, XL_CHART_TYPE.LINE, ages, [
    ("方案 A 年繳", [row["aSavings"] + row["medical"] for row in YEARS]),
    ("方案 B 年繳", [row["bSavings"] + row["medical"] for row in YEARS]),
], Inches(0.4), Inches(1.2), Inches(12.5), Inches(5.6))
footer(s, 5)

# 6 bands
s = blank()
textbox(s, Inches(0.4), Inches(0.25), Inches(12), Inches(0.45), "提取節奏", 28, True)
textbox(s, Inches(0.4), Inches(0.75), Inches(12), Inches(0.3), "金額來自三份建議書的現金提取舉例。方案 A 是 A2 加 A1。", 14, color=COCOA)
for i, (title, body, fill) in enumerate((
    ("A2 · 38 歲開始", "60–74 歲每年 HK$ 23,550\n75–85 歲每年 HK$ 31,400\n86–100 歲每年 HK$ 39,250\n合計 HK$ 1,287,400", WHITE),
    ("A1 · 48 歲開始", "65–74 歲每年 HK$ 15,700\n75–85 歲每年 HK$ 23,550\n86–100 歲每年 HK$ 31,400\n合計 HK$ 887,050", YELLOW),
    ("方案 B", "60–64 歲每年 HK$ 23,550\n65–74 歲每年 HK$ 39,250\n75–84 歲每年 HK$ 54,950\n85–100 歲每年 HK$ 70,650\n合計 HK$ 2,190,150", PINK),
)):
    left = Inches(0.35 + i * 4.3)
    card(s, left, Inches(1.2), Inches(4.1), Inches(4.4), fill)
    textbox(s, left + Inches(0.2), Inches(1.4), Inches(3.7), Inches(0.45), title, 18, True)
    textbox(s, left + Inches(0.2), Inches(2.0), Inches(3.7), Inches(3.2), body, 16)
textbox(s, Inches(0.4), Inches(5.8), Inches(12.4), Inches(1), "只有 85 歲不同：方案 A 提取 HK$ 54,950，方案 B 提取 HK$ 70,650。終身相差 HK$ 15,700。", 16)
footer(s, 6)

# 7 withdrawal chart
s = blank()
textbox(s, Inches(0.4), Inches(0.2), Inches(12), Inches(0.4), "每年提取多少", 28, True)
add_chart(s, XL_CHART_TYPE.LINE, [row["age"] for row in wd_rows], [
    ("方案 A2", [row["wdA2"] for row in wd_rows]),
    ("方案 A1", [row["wdA1"] for row in wd_rows]),
    ("方案 A 合計", [row["wdA"] for row in wd_rows]),
    ("方案 B", [row["wdB"] for row in wd_rows]),
], Inches(0.3), Inches(0.75), Inches(12.7), Inches(6.1))
footer(s, 7)

# 8 cumulative
s = blank()
textbox(s, Inches(0.4), Inches(0.2), Inches(12), Inches(0.4), "累計提取", 28, True)
textbox(s, Inches(0.4), Inches(0.65), Inches(12), Inches(0.3), "100 歲：方案 A HK$ 2,174,450，方案 B HK$ 2,190,150。", 14, color=COCOA)
add_chart(s, XL_CHART_TYPE.LINE, [row["age"] for row in wd_rows], [
    ("方案 A 累計提取", [row["wdACum"] for row in wd_rows]),
    ("方案 B 累計提取", [row["wdBCum"] for row in wd_rows]),
], Inches(0.3), Inches(1.05), Inches(12.7), Inches(5.8))
footer(s, 8)

# 9 vs medical
s = blank()
textbox(s, Inches(0.4), Inches(0.2), Inches(12), Inches(0.4), "當年提取和當年醫療", 28, True)
textbox(s, Inches(0.4), Inches(0.65), Inches(12.5), Inches(0.45), "82–84 歲兩邊都少於醫療。85 歲只有方案 A 少於醫療。89–100 歲兩邊都少於醫療。100 歲相差 HK$ 14,774.80。", 14, color=COCOA)
add_chart(s, XL_CHART_TYPE.LINE, [row["age"] for row in wd_rows], [
    ("當年醫療", [row["medical"] for row in wd_rows]),
    ("方案 A 提取", [row["wdA"] for row in wd_rows]),
    ("方案 B 提取", [row["wdB"] for row in wd_rows]),
], Inches(0.3), Inches(1.2), Inches(12.7), Inches(5.6))
footer(s, 9)

# 10 plan A surrender
s = blank()
textbox(s, Inches(0.4), Inches(0.2), Inches(12), Inches(0.4), "方案 A 退保價值", 28, True)
textbox(s, Inches(0.4), Inches(0.65), Inches(12), Inches(0.3), "不提取對照提取後。48 歲起是兩張單相加。", 14, color=COCOA)
add_chart(s, XL_CHART_TYPE.LINE, ages, [
    ("不提取", [row["surrANowd"] for row in YEARS]),
    ("提取後", [row["surrAAfter"] for row in YEARS]),
], Inches(0.3), Inches(1.05), Inches(12.7), Inches(5.8))
footer(s, 10)

# 11 plan B surrender
s = blank()
textbox(s, Inches(0.4), Inches(0.2), Inches(12), Inches(0.4), "方案 B 退保價值", 28, True)
textbox(s, Inches(0.4), Inches(0.65), Inches(12), Inches(0.3), "提取後的線就是總表的可退保現金價值。", 14, color=COCOA)
add_chart(s, XL_CHART_TYPE.LINE, ages, [
    ("不提取", [row["surrBNowd"] for row in YEARS]),
    ("提取後", [row["surrBAfter"] for row in YEARS]),
], Inches(0.3), Inches(1.05), Inches(12.7), Inches(5.8))
footer(s, 11)

# 12 compare after
s = blank()
textbox(s, Inches(0.4), Inches(0.2), Inches(12), Inches(0.4), "提取之後，兩邊還剩多少", 28, True)
add_chart(s, XL_CHART_TYPE.LINE, ages, [
    ("方案 A 提取後", [row["surrAAfter"] for row in YEARS]),
    ("方案 B 提取後", [row["surrBAfter"] for row in YEARS]),
], Inches(0.3), Inches(0.7), Inches(12.7), Inches(4.3))
textbox(s, Inches(0.4), Inches(5.1), Inches(12.5), Inches(1.8),
        f"60 歲  A {money(at(60)['surrAAfter'])}    B {money(at(60)['surrBAfter'])}\n"
        f"85 歲  A {money(at(85)['surrAAfter'])}    B {money(at(85)['surrBAfter'])}\n"
        f"100 歲 A {money(at(100)['surrAAfter'])}    B {money(at(100)['surrBAfter'])}", 16)
footer(s, 12)

# 13 age 100
s = blank()
textbox(s, Inches(0.4), Inches(0.3), Inches(12), Inches(0.5), "100 歲", 32, True)
card(s, Inches(0.4), Inches(1.1), Inches(6.2), Inches(5.2), WHITE)
textbox(s, Inches(0.6), Inches(1.3), Inches(5.8), Inches(0.45), "方案 A", 22, True)
textbox(s, Inches(0.6), Inches(2.0), Inches(5.8), Inches(3.8),
        f"不提取 {money(at(100)['surrANowd'])}\n已提取 {money(at(100)['wdACum'])}\n提取後 {money(at(100)['surrAAfter'])}\n連醫療已繳 {money(at(100)['aPaid'])}", 18)
card(s, Inches(6.8), Inches(1.1), Inches(6.1), Inches(5.2), YELLOW)
textbox(s, Inches(7.0), Inches(1.3), Inches(5.7), Inches(0.45), "方案 B", 22, True)
textbox(s, Inches(7.0), Inches(2.0), Inches(5.7), Inches(3.8),
        f"不提取 {money(at(100)['surrBNowd'])}\n已提取 {money(at(100)['wdBCum'])}\n提取後 {money(at(100)['surrBAfter'])}\n連醫療已繳 {money(at(100)['bPaid'])}", 18)
footer(s, 13)

# 14 notes
s = blank()
textbox(s, Inches(0.4), Inches(0.35), Inches(12), Inches(0.55), "怎樣讀這些數", 32, True)
textbox(s, Inches(0.5), Inches(1.3), Inches(12.2), Inches(5.2),
        "退保價值大部分是非保證的終期分紅。\n\n"
        "提取先從可套現的復歸紅利及其終期分紅扣除。超出的部分會動用保證現金價值，並減少基本金額。提取後的數字已經反映這件事。\n\n"
        "不要用不提取的退保價值減去提取金額，來估算提取後還剩多少。\n\n"
        "47 歲兩邊的退保價值仍低於已繳保費。57 歲兩邊都高過已繳保費，那時還沒有開始提取。\n\n"
        "這不是免遺產認證的承諾，也不是買賣要約。", 20)
footer(s, 14)


def cell_text(cell, text, size=9, bold=False):
    cell.text = ""
    p = cell.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT
    set_run(p, text, size, bold)
    cell.margin_left = Inches(0.03)
    cell.margin_right = Inches(0.03)


headers = ["年齡", "年份", "醫療", "A提取", "B提取", "A不提取", "B不提取", "A提取後", "B提取後"]
chunk = 16
for start in range(0, len(YEARS), chunk):
    part = YEARS[start:start + chunk]
    s = blank()
    textbox(s, Inches(0.25), Inches(0.1), Inches(12), Inches(0.32), f"附錄 · {part[0]['age']}–{part[-1]['age']} 歲", 18, True)
    table = s.shapes.add_table(len(part) + 1, len(headers), Inches(0.2), Inches(0.5), Inches(12.9), Inches(6.4)).table
    widths = [0.8, 0.95, 1.35, 1.25, 1.25, 1.85, 1.85, 1.8, 1.8]
    for i, width in enumerate(widths):
        table.columns[i].width = Inches(width)
    for i, label in enumerate(headers):
        cell = table.cell(0, i)
        cell_text(cell, label, 10, True)
        cell.fill.solid()
        cell.fill.fore_color.rgb = YELLOW
    for r, row in enumerate(part, start=1):
        values = [str(row["age"]), str(row["year"]), money(row["medical"]), money(row["wdA"]), money(row["wdB"]),
                  money(row["surrANowd"]), money(row["surrBNowd"]), money(row["surrAAfter"]), money(row["surrBAfter"])]
        for c, value in enumerate(values):
            cell = table.cell(r, c)
            cell_text(cell, value, 9, False)
            cell.fill.solid()
            cell.fill.fore_color.rgb = WHITE if r % 2 else PINK

assert at(60)["wdA"] == at(60)["wdB"] == 23550
assert at(85)["wdA"] == 54950 and at(85)["wdB"] == 70650
assert at(100)["wdACum"] == 2174450 and at(100)["wdBCum"] == 2190150
assert at(100)["surrANowd"] == 14592718.25 and at(100)["surrBNowd"] == 15880871.85
assert at(100)["surrAAfter"] == 6349323.35 and at(100)["surrBAfter"] == 7942355.25
assert at(47)["aPaid"] == 314233.6 and at(100)["medical"] == 85424.8
assert len(YEARS) == 63

for path in OUT:
    path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(path)
    print("wrote", path, "slides", len(prs.slides))
