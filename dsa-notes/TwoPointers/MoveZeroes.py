class Solution(object):
    def moveZeroes(self, nums):
        """
        :type nums: List[int]
        :rtype: None Do not return anything, modify nums in-place instead.
        """

        # 'left' points to the next position where a non-zero element
        # should be placed, while 'right' scans the array.
        left = 0
        right = 0
        end = len(nums) - 1

        # Move all non-zero elements to the front of the array.
        while right <= end:

            # If the current element is non-zero,
            # place it at the 'left' pointer.
            if nums[right] != 0:
                nums[left] = nums[right]
                right += 1
                left += 1

            # Otherwise, simply continue scanning.
            else:
                right += 1

        # Fill the remaining positions with zeros.
        while left <= end:
            nums[left] = 0
            left += 1

        return nums
