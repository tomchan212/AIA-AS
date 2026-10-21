# Calculations

These are reference rules for an educational page. They are not a requirement to buy any product. Insurance, funds, and securities are not named or ranked.

## Pyramid shares

Financial assets are emergency cash, stable savings, growth investments, and higher-risk holdings. Each share is the layer amount divided by the total. Insurance sums assured are not added into that total. Negative amounts are treated as zero and a warning is shown. Amounts above the money cap in `apps/pyramid/lib/config/pyramid.ts` are capped.

## Status

For stable savings and growth, the layer is enough when its share is at least 85% of the reference share, partial from 50% up to that line, and a serious gap below 50%.

Higher-risk holdings are enough while they stay within 1.25 times the reference share. They are partial up to the larger of twice the reference share or 10% of assets, and a serious gap above that. This flags a high-risk share above 10% when the reference share is smaller.

Protection status is the weakest of emergency cash, life cover, medical cover, and, in adviser mode, critical-illness cover and accident cover.

## Health score

Enough scores 100, partial 55, and a serious gap 15. The weights are protection 40%, stable savings 25%, growth 20%, and higher-risk control 15%. The score is the rounded weighted sum.

## Emergency cash

Months covered are emergency cash divided by monthly spending. If spending is zero, the months are not calculated.

The reference target is 3 months of spending, or 6 months when there is at least one dependant. That matches the common 3 to 6 month description published by the Investor and Financial Education Council. In adviser mode, marking income as variable adds 3 months, with a cap of 12. Leaving it unset keeps the 3 or 6 month target.

A partial emergency gap is below the target but at least half of it. Below that, the gap is serious.

## Life-cover reference

Annual income is monthly income times 12. The default multiplier is 10, plus 1 for each dependant, and it is not taken above 15. The reference amount is annual income times that multiplier, plus outstanding debt. Debt is not treated as an asset.

The result page can try another multiplier. That alternative is shown beside the reference. It does not replace the saved result unless the visitor is only exploring it on screen. The multiplier is a rule of thumb, not a requirement.

## Medical comparison

When a yearly medical limit is entered, it is compared with the VHIS Standard Plan annual benefit limit in the snapshot (HK$420,000 per policy year in the template checked on 21 October 2026):

- above the reference: the entered limit is at least that amount
- around the reference: at least 80% of it
- below the reference: under 80%, or the visitor said they have no medical cover

If the limit was not asked or not entered, the page says the comparison is unavailable. No private-hospital typical bill is used, because no official single figure was verified. A stress illustration can multiply the public acute inpatient fee (HK$300 a day for an eligible person, from 1 January 2026) by a number of days the visitor chooses.

## Inflation illustration

Today's cash divided by `(1 + headline Composite CPI) ^ years` is the illustrated purchasing power after 1, 5, or 10 years. The headline rate in the snapshot is 1.7% for August 2026. The same amount times `(1 + savings-deposit rate) ^ years` is what that quoted average savings rate would do to the balance. The two are illustrations, not forecasts.

## Age guide

`100 − age`, then capped between 0% and 80%, is shown as a discussion starting point for the combined growth and higher-risk share. It is not an official Hong Kong statistic and it does not change the pyramid reference weights. Those weights still come from the risk profile, age shift, and dependants in `idealWeights`.

## Peer context

Only after the visitor opts in, monthly income is compared with the C&SD medians in the snapshot. Within 10% either side is "around". This is computed on the device.

## What-if

Moving one layer keeps the total of the four layers the same. The difference is shared across the other layers in their current proportions. The health score and radar are then the normal pyramid result for those amounts.

## Gap illustration

For a short layer, the cash gap is the reference amount minus the amount entered, when that difference is positive. Dividing by 6, 12, or 24 gives an illustrative monthly amount. It is arithmetic, not a savings product. An excess layer shows the amount above the reference and does not invent a monthly saving. A protection gap that is not a cash gap, such as life cover below the reference, is shown as a cover difference, not as a monthly payment.

## Stress

Job loss sets the need to monthly spending times the chosen months and compares it with emergency cash. A market drop reduces growth and higher-risk amounts by 20% or 30% and runs the pyramid again. Illness uses the public daily fee times the chosen days.

## Score history

A dated health score is kept in the same encrypted browser store as the draft, and only for the visitor's own result, not for an anonymous example. Export wraps that list with PBKDF2 (120,000 iterations, SHA-256) and AES-GCM. The passphrase never leaves the device. The file contains dates and scores, not income or cover amounts.
