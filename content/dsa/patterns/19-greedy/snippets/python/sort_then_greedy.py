# Template 1: sort, then match greedily. Each child needs a cookie of at least greed[i]; each cookie feeds one child.
# Walk the cookies smallest first and give each one to the least greedy child still waiting, if it is big enough.
def find_content_children(greed, cookies):
    g = sorted(greed)
    c = sorted(cookies)
    child = 0
    for cookie in c:
        if child >= len(g):
            break
        if cookie >= g[child]:
            child += 1  # feed this child; a too-small cookie is useless to everyone left
    return child
