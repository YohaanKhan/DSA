class Solution(object):
    def backspaceCompare(self, s, t):
        """
        :type s: str
        :type t: str
        :rtype: bool
        """

        # Stacks to store the final characters after processing backspaces
        s_final = []
        len1 = 0
        t_final = []
        len2 = 0

        # Process the first string
        for char in s:

            # If a backspace is encountered, remove the last character
            # from the stack if it is not empty.
            if char == "#":
                if len1 > 0:
                    s_final.pop()
                    len1 -= 1

            # Otherwise, add the current character to the stack.
            else:
                s_final.append(char)
                len1 += 1

        # Process the second string
        for char in t:

            # Handle backspace by removing the last character
            # if the stack is not empty.
            if char == "#":
                if len2 > 0:
                    t_final.pop()
                    len2 -= 1

            # Otherwise, add the current character to the stack.
            else:
                t_final.append(char)
                len2 += 1

        # Compare the final processed strings.
        if s_final == t_final:
            return True

        return False
