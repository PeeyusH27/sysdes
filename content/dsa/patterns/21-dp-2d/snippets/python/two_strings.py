# Two-string DP: dp[i][j] = length of the longest common subsequence of a[:i] and b[:j].
# Row 0 and column 0 stand for the empty prefix (LCS 0), so the loops start at 1 and read a[i - 1], b[j - 1].
# After filling, walk back from dp[m][n] to rebuild one longest common subsequence.
def lcs_string(a, b):
    m = len(a)
    n = len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1              # both last letters are used
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])   # drop one of them
    out = []
    i, j = m, n
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1])  # this cell came from the diagonal: the letter is in the answer
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1                # the value came from above
        else:
            j -= 1                # the value came from the left
    return "".join(reversed(out))
