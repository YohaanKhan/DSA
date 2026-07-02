class Solution(object):
    def mergeAlternately(self, word1, word2):
        """
        :type word1: str
        :type word2: str
        :rtype: str
        """

        # Store the lengths of both strings
        m = len(word1)
        n = len(word2)

        # List to efficiently build the merged string
        res = []

        # Traverse until the end of the shorter string
        traverse = min(m, n)

        # Append one character from each string alternately
        for i in range(traverse):
            res.append(word1[i])
            res.append(word2[i])

        # Append the remaining characters from the longer string
        if m > n:
            res.append(word1[n:m])

        elif n > m:
            res.append(word2[m:n])

        # Join the list into the final merged string
        return "".join(res)
