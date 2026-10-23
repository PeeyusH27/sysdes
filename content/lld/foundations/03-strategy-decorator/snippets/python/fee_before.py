# Every new rule is one more `if`, and the order of the ifs is the order of the rules, hidden.
def parking_fee(stay):
    hours = (stay["minutes"] + 59) // 60  # every started hour counts
    if stay["vehicle"] == "bike":
        fee = hours * 10
    elif stay["vehicle"] == "truck":
        fee = hours * 40
    else:
        fee = hours * 20

    if stay["minutes"] <= 10:                                  # grace period
        fee = 0
    if stay["enter_hour"] >= 22 or stay["enter_hour"] < 6:     # night discount
        fee = (fee + 1) // 2
    if fee > 100:                                              # cap
        fee = 100
    return fee
