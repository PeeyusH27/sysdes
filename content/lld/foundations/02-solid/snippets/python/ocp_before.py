# Every new customer kind reopens this function.
def price(kind, cents):
    if kind == "regular":
        return cents
    if kind == "gold":
        return cents - cents // 10
    if kind == "employee":
        return cents - cents * 3 // 10
    return cents  # 'student' is silently charged in full until someone edits this
