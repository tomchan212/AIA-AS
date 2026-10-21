# Data sources

The browser reads a static snapshot. It does not send the visitor's numbers anywhere to obtain these figures. The canonical file is `data/benchmarks.json`. `scripts/refresh-benchmarks.mjs` checks the schema and copies it to `apps/pyramid/data/benchmarks.json` and `apps/pyramid/public/data/benchmarks.json`.

Refresh the savings-deposit rate from the public HKMA API, without sending any visitor data:

```bash
node scripts/refresh-benchmarks.mjs --refresh-hkma
```

Other figures are updated by hand after checking the official page, then the same script is run without the flag so the copies stay aligned. A figure is marked stale in the app when today is later than `asOf` plus `refreshCadence`.

| id | value | as of | cadence | source |
| --- | --- | --- | --- | --- |
| csd-median-household-income | HK$30,000 a month | 2026-03-31 | 3 months | [C&SD GHS Q1 2026](https://www.censtatd.gov.hk/wbr/B1050001/B10500012026QQ01/att/en/B10500012026QQ01.pdf) |
| csd-median-active-household-income | HK$40,600 a month | 2026-03-31 | 3 months | same GHS report |
| csd-median-employment-earnings | HK$21,000 a month | 2026-03-31 | 3 months | same GHS report |
| csd-median-earnings-by-age | not verified | | 3 months | [C&SD](https://www.censtatd.gov.hk/en/) |
| csd-median-earnings-by-occupation | not verified | | 1 year | [C&SD](https://www.censtatd.gov.hk/en/) |
| csd-household-expenditure-average | not verified | | 5 years | [C&SD](https://www.censtatd.gov.hk/en/) |
| csd-cpi-composite-yoy | 1.7% | 2026-08-31 | 2 months | [C&SD CPI, August 2026](https://www.info.gov.hk/gia/general/202609/23/P2026092300316.htm) |
| csd-cpi-composite-underlying-yoy | 1.9% | 2026-08-31 | 2 months | same CPI release |
| hkma-base-rate | 4.25% | 2026-09-17 | 3 months | [HKMA Base Rate announcement](https://www.hkma.gov.hk/eng/news-and-media/press-releases/2026/09/20260917-3/) |
| hkab-hibor-overnight | 2.34476% | 2026-10-21 | 1 day | [HKAB HIBOR](https://www.hkab.org.hk/en/rates/hibor) |
| hkab-hibor-3m | 3.26744% | 2026-10-21 | 1 day | same HKAB page, 11:15 a.m. |
| hkma-savings-deposit-rate | 0.001% | 2026-09-30 | 2 months | [HKMA API, table 6.4.2](https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/hkd-ir-periodaverage) |
| hkma-ibond-latest | not verified | | 1 year | [HKMA government bond programme](https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/debt-market-development/government-bond-programme/) |
| hkma-silver-bond-latest | not verified | | 1 year | same HKMA page |
| mpfa-contribution-rate | 5% | 2026-10-21 | 1 year | [MPFA employees](https://www.mpfa.org.hk/en/mpf-system/mandatory-contributions/employees) |
| mpfa-min-relevant-income | HK$7,100 a month | 2026-10-21 | 1 year | same MPFA page |
| mpfa-max-relevant-income | HK$30,000 a month | 2026-10-21 | 1 year | same MPFA page; cap HK$1,500 |
| mpfa-fer-equity | 1.44% | 2026-09-30 | 6 months | [MPFA fund platform](https://mfp.mpfa.org.hk/eng/mpp_fer.jsp) |
| mpfa-fer-mixed | 1.26% | 2026-09-30 | 6 months | same platform |
| mpfa-fer-conservative | 0.82% | 2026-09-30 | 6 months | same platform |
| vhis-standard-annual-limit | HK$420,000 a policy year | 2026-10-21 | 1 year | [VHIS Standard Plan template](https://www.vhis.gov.hk/doc/en/information_centre/e_standard_plan_template.pdf) |
| ha-acute-inpatient-day | HK$300 a day | 2026-01-01 | 1 year | [Hospital Authority fees](https://www.ha.org.hk/visitor/fees_and_charges.asp) |
| private-inpatient-typical | not verified | | 1 year | no official single private bill |
| ifec-emergency-months-low | 3 months | 2026-10-21 | 1 year | [IFEC savings](https://www.ifec.org.hk/web/en/moneyessentials/savings.page) |
| ifec-emergency-months-high | 6 months | 2026-10-21 | 1 year | same IFEC page |
| sfc-risk-education | no number | 2026-10-21 | 1 year | [IFEC getting started](https://www.ifec.org.hk/web/en/moneyessentials/financial-planning/getting-started.page) |

The savings-deposit figure is 0.001 percent per annum, which is what the HKMA series published for September 2026. It is not 0.1 percent.

Household-income and employment-earnings medians are for Q1 2026. By 21 October 2026 they are outside a three-month refresh window, so the page shows a "data may be outdated" badge for them even though a later quarter was not verified for this snapshot.
