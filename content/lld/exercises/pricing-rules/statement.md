Build a **pricing engine** for a car park. A stay costs a base fee, and an operator can stack extra rules on top at runtime: a grace period, a daily cap, a member discount, a minimum charge. Every rule **wraps whatever was added before it**, in the order the rules were added, so the engine is a chain: each rule receives the fee computed so far and returns a new one. That is the Decorator pattern, and the requirement is the usual one: adding a new kind of rule must not mean editing the existing rules or the engine's fee calculation.

Implement the class `PricingEngine`:

- `PricingEngine(ratePerHour)`: the hourly rate in **cents**. The base fee charges every **started** hour: `ceil(minutes / 60) × ratePerHour`, so 60 minutes is 1 hour, 61 minutes is 2 hours, and 0 minutes is 0 hours (a fee of 0).
- `addRule(name, params)`: puts a rule at the end of the chain and returns `true`. It returns `false`, and changes nothing, if `name` is not one of the four rules below, or if a rule with that name is already in the chain.
- `removeRule(name)`: takes that rule out of the chain (the others keep their order) and returns `true`; returns `false` if no such rule is in the chain.
- `fee(minutes)`: the price in cents for a stay of `minutes` (a whole number, 0 or more). Start with the base fee, then apply the rules in the order they were added, each to the result of the one before.

**The rules**, where `fee` means the fee computed so far:

- `"grace"` with `{minutes}`: if the stay is `minutes` long or shorter, the fee becomes 0. Otherwise it is unchanged.
- `"daily-cap"` with `{cap}`: the fee becomes `min(fee, cap × days)`, where `days` is the number of **started** 24-hour days, `ceil(minutes / 1440)`. So 1440 minutes is 1 day and 1441 minutes is 2 days.
- `"member-discount"` with `{percent}`: the fee becomes `floor(fee × (100 - percent) / 100)`. The discounted amount is rounded down to whole cents (a fee of 333 with 10 percent off is 299, not 300).
- `"minimum"` with `{cents}`: if the fee is greater than 0 it becomes `max(fee, cents)`. A fee of **0 stays 0**: a stay that is free, because it lasted 0 minutes or because an earlier rule made it free, is never raised to the minimum.

**Notes**

- Order matters, and the tests check it. `member-discount` then `minimum` is not the same as `minimum` then `member-discount`, and a daily cap before a discount is not a daily cap after it.
- Rules only look at the fee so far and the length of the stay, never at when the rule was added.
- Params are always valid. At most one rule of each name is in the chain at a time, so a name identifies a rule.
- Removing a rule gives back exactly the fees the remaining rules would have produced if the removed rule had never been added.
