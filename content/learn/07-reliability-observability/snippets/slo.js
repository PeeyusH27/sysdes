// Error budget: the failures an SLO allows. 99.9% of 10M requests → 10,000 may fail.
export const errorBudget = (slo, requests) => Math.round((1 - slo) * requests);

// Burn rate: how fast you spend the budget. 1 = exactly on budget for the whole window.
export const burnRate = (errorRate, slo) => errorRate / (1 - slo);

// Share of a 30-day budget spent after `hours` at a given burn rate
export const budgetSpent = (rate, hours, windowDays = 30) => (rate * hours) / (windowDays * 24);

// burnRate(0.0144, 0.999) → 14.4: 1.44% errors against a 99.9% SLO
// budgetSpent(14.4, 1) → 0.02: 2% of the month's budget gone in one hour → page someone
// budgetSpent(6, 6)    → 0.05: 5% in six hours → page
// budgetSpent(1, 72)   → 0.10: 10% in three days → open a ticket
// At 14.4× the whole budget lasts 720 h / 14.4 = 50 hours
