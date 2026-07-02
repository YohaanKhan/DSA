class Solution(object):
    def partitionLabels(self, s):
        """
        :type s: str
        :rtype: List[int]
        """

        # Stores the last occurrence index of each character ('a' to 'z')
        char = [0] * 26

        # Keeps track of whether we've already recorded the last occurrence
        seen = [False] * 26

        # Stores the sizes of the partitions
        res = []

        # Traverse from right to left to record the last occurrence
        # of every character exactly once
        for i in range(len(s) - 1, -1, -1):
            el = ord(s[i]) - ord("a")
            if not seen[el]:
                char[el] = i
                seen[el] = True

        # Start of the current partition
        left = 0
        end = len(s) - 1

        # Process the string partition by partition
        while left <= end:

            # Initial boundary is the last occurrence of the first
            # character in the current partition
            right = char[ord(s[left]) - ord("a")]

            # Scan the current partition
            i = left
            while i <= right:

                # If any character inside the partition occurs later,
                # extend the partition boundary
                right = max(right, char[ord(s[i]) - ord("a")])
                i += 1

            # Once we've reached the final boundary,
            # record the partition length
            res.append(right - left + 1)

            # Start the next partition
            left = right + 1

        return res
