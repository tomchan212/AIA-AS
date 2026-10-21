# Upgrade report

Checked on 21 October 2026 against the public pages linked in `docs/DATA_SOURCES.md`.

## Verified and shown with a source and date

- C&SD Q1 2026 median household income HK$30,000, economically active households HK$40,600, and median employment earnings HK$21,000.
- C&SD Composite CPI for August 2026: 1.7% headline and 1.9% underlying.
- HKMA Base Rate 4.25% announced on 17 September 2026.
- HKAB overnight and 3-month HKD interest settlement rates at 11:15 a.m. on 21 October 2026.
- HKMA average savings deposit rate 0.001% for September 2026. The figure is small because that is the published percent-per-annum value.
- MPFA mandatory 5% contribution, monthly relevant income from HK$7,100 to HK$30,000, and the HK$1,500 cap.
- MPFA fund-platform average FER on 30 September 2026 for equity, mixed-asset, and conservative funds. Averages only. No fund is named in the app.
- VHIS Standard Plan annual benefit limit HK$420,000 per policy year, lifetime limit nil, from the template on vhis.gov.hk.
- Hospital Authority acute inpatient fee HK$300 a day for eligible persons, effective 1 January 2026.
- IFEC three-to-six-month emergency-fund description.

## Left blank

- Median earnings by age and by occupation.
- A current household-expenditure-survey average.
- A single official private inpatient bill.
- A current iBond or Silver Bond coupon. Each issue has its own terms.
- A numeric SFC risk-class threshold. The learn card uses IFEC education instead, and names no product.

## Assumptions

- The pyramid reference weights, 85% and 50% share bands, and the 10-times life-cover rule of thumb were already in the app. They are not new official statistics.
- `100 − age` is labelled as a discussion starting point. It does not change the reference pyramid.
- "Around" a median or the VHIS limit means within 10% or at least 80%. Those bands are choices of this page, stated in `docs/CALCULATIONS.md`.
- Adviser mode can add 3 months to the emergency target when income is marked variable, capped at 12. The default remains 3 or 6 months.
- Anonymous examples use the verified medians as incomes. Their other amounts are invented illustrations, and the page says so.
- Q1 2026 income medians are outside a three-month window on 21 October 2026, so the outdated badge is expected for those rows.

## Compliance review before a wider release

A licensed person should read the life-cover multiplier, the emergency-month rule, and the VHIS comparison, and confirm the wording still avoids a product recommendation. The snapshot should be refreshed when C&SD, HKMA, MPFA, VHIS, or the Hospital Authority publish a new figure. The WhatsApp number handling was not changed. Visitor inputs stay in the encrypted browser store except when the visitor confirms a WhatsApp summary.

## Manual QA checklist

- Traditional Chinese, light, quick mode, mobile: consent, one question per step, result, print preview.
- Traditional Chinese, dark, adviser mode, desktop: variable-income target, medical comparison, what-if reset.
- English, light, quick mode, desktop: sources drawer, outdated badge, glossary.
- English, dark, adviser mode, mobile: stress test, score export and import, sample confirmation.
- Anonymous ranks: 保守, 穩健, 平衡, 進取 each recolour the pyramid and keep the example note.
- Print: formulas, as-of dates, and the disclaimer are visible.
- Keyboard: sources disclosure, sliders, dialog, and radar table.
