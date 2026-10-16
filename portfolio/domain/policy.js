function parseISODate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function dateParts(date) {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function compareDate(a, b) {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

/**
 * @returns {true | false | null} null means the term cannot be verified.
 */
export function isInForce(policy, client = {}, today = new Date()) {
  if (policy.inForce === false) return false;
  const coverage = policy.coverage;
  if (!coverage || coverage.kind === "whole") return true;

  const now = dateParts(today);
  if (coverage.kind === "years") {
    const start = parseISODate(policy.inceptionDate);
    const years = Number(coverage.years);
    if (!start || !Number.isInteger(years) || years <= 0) return null;
    const end = { y: start.y + years, m: start.m, d: start.d };
    return compareDate(now, end) < 0;
  }

  if (coverage.kind === "toAge") {
    const age = client.ageYears;
    const toAge = Number(coverage.toAge);
    if (!Number.isInteger(toAge) || toAge <= 0) return null;
    if (!Number.isInteger(age) || age < 0) return null;
    return age < toAge;
  }

  return null;
}

export function partitionPolicies(policies, client, today = new Date()) {
  const inForce = [];
  const lapsed = [];
  const unverified = [];
  for (const policy of policies) {
    const status = isInForce(policy, client, today);
    if (status === true) inForce.push(policy);
    else if (status === false) lapsed.push(policy);
    else unverified.push(policy);
  }
  return { inForce, lapsed, unverified };
}
