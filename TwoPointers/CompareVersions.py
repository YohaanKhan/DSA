class Solution(object):
    def compareVersion(self, version1, version2):
        """
        :type version1: str
        :type version2: str
        :rtype: int
        """

        # Split both version strings into individual revision numbers.
        # Example: "1.0.3" -> ["1", "0", "3"]
        v1 = version1.split(".")
        v2 = version2.split(".")

        # Compare up to the length of the longer version.
        # Missing revisions are treated as 0.
        n = max(len(v1), len(v2))

        for i in range(n):

            # Get the current revision from version1.
            # If it doesn't exist, consider it as 0.
            if i < len(v1):
                rev1 = int(v1[i])
            else:
                rev1 = 0

            # Get the current revision from version2.
            # If it doesn't exist, consider it as 0.
            if i < len(v2):
                rev2 = int(v2[i])
            else:
                rev2 = 0

            # Compare the current revisions.
            if rev1 < rev2:
                return -1
            elif rev1 > rev2:
                return 1

        # All corresponding revisions are equal.
        return 0
