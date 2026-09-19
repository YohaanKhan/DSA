class Solution(object):
    def compress(self, chars):
        # Tracks the frequency of the current character
        start = 1

        # Current character being compressed
        char = chars[0]

        # Stores the compressed result
        res = []

        # Traverse the array starting from the second character
        for i in range(1, len(chars)):
            curr = chars[i]

            # Continue counting if the current character is the same
            if curr == char:
                start += 1
            else:
                # Current group has ended, add the character
                res.append(char)

                # Append the count only if it is greater than 1
                # Each digit is stored as a separate character
                if start > 1:
                    for digit in str(start):
                        res.append(digit)

                # Begin tracking the next character group
                char = curr
                start = 1

        # Process the final character group
        res.append(char)
        if start > 1:
            for digit in str(start):
                res.append(digit)

        # Copy the compressed result back into the original array
        for i in range(len(res)):
            chars[i] = res[i]

        # Return the length of the compressed array
        return len(res)
