def spread(amount, weights):
    """Floor each proportional share, then give the leftover cents one each to the first users in order."""
    total = sum(weights)
    shares = [amount * w // total for w in weights]
    for i in range(amount - sum(shares)):
        shares[i] += 1
    return shares


def _ints(data):
    return all(isinstance(x, int) and not isinstance(x, bool) for x in data)


# Strategy: a split type turns (amount, users, data) into one share per user, or None if the data is invalid.
def equal(amount, users, data):
    return spread(amount, [1] * len(users))


def exact(amount, users, data):
    ok = len(data) == len(users) and _ints(data) and all(c >= 0 for c in data) and sum(data) == amount
    return list(data) if ok else None


def percent(amount, users, data):
    ok = len(data) == len(users) and _ints(data) and all(p >= 1 for p in data) and sum(data) == 100
    return spread(amount, data) if ok else None


def shares(amount, users, data):
    ok = len(data) == len(users) and _ints(data) and all(w >= 1 for w in data)
    return spread(amount, data) if ok else None


# Adding a split type is one new entry here. Nothing else changes.
SPLITS = {"equal": equal, "exact": exact, "percent": percent, "shares": shares}


class Splitwise:
    def __init__(self, members):
        self.members = set(members)
        self.owed = {}  # (from, to) -> cents; only one direction per pair is non-zero
        self.count = 0

    def _get(self, source, to):
        return self.owed.get((source, to), 0)

    def _add(self, debtor, creditor, cents):
        if debtor == creditor or cents == 0:
            return
        net = self._get(debtor, creditor) + cents - self._get(creditor, debtor)  # positive: debtor owes creditor
        self.owed[(debtor, creditor)] = max(0, net)
        self.owed[(creditor, debtor)] = max(0, -net)

    def add_expense(self, payer, amount, type, users, data):
        split = SPLITS.get(type)
        if split is None:
            return "INVALID"
        if payer not in self.members or not users or len(set(users)) != len(users):
            return "INVALID"
        if not all(u in self.members for u in users):
            return "INVALID"
        if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0:
            return "INVALID"
        result = split(amount, users, data)
        if result is None:
            return "INVALID"  # validate everything before the first write
        for user, share in zip(users, result):
            self._add(user, payer, share)
        self.count += 1
        return "OK"

    def settle(self, source, to, amount):
        if source not in self.members or to not in self.members or source == to:
            return "INVALID"
        if not isinstance(amount, int) or isinstance(amount, bool) or amount <= 0 or amount > self._get(source, to):
            return "INVALID"
        self.owed[(source, to)] = self._get(source, to) - amount
        return "OK"

    def owes(self, source, to):
        return self._get(source, to)

    def balance(self, user):
        net = 0
        for (source, to), cents in self.owed.items():
            if source == user:
                net -= cents
            if to == user:
                net += cents
        return net

    def simplify(self):
        debtors = [[m, -self.balance(m)] for m in self.members if self.balance(m) < 0]
        creditors = [[m, self.balance(m)] for m in self.members if self.balance(m) > 0]
        key = lambda entry: (-entry[1], entry[0])
        plan = []
        while debtors and creditors:
            debtors.sort(key=key)
            creditors.sort(key=key)
            pay = min(debtors[0][1], creditors[0][1])
            plan.append([debtors[0][0], creditors[0][0], pay])
            debtors[0][1] -= pay
            creditors[0][1] -= pay
            if debtors[0][1] == 0:
                debtors.pop(0)
            if creditors[0][1] == 0:
                creditors.pop(0)
        return plan

    def expense_count(self):
        return self.count
