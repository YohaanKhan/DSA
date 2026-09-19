class Solution(object):
    def nextPermutation(self, nums):
        """
        :type nums: List[int]
        :rtype: None Do not return anything, modify nums in-place instead.
        """

        n = len(nums)

        # Find the first element (from the right) that is smaller than its next element.
        # This is the pivot where the next permutation can be formed.
        pivot = n - 2
        while pivot >= 0 and nums[pivot] >= nums[pivot + 1]:
            pivot -= 1

        # If no pivot exists, the array is in descending order.
        # Reverse it to obtain the smallest possible permutation.
        if pivot == -1:
            nums.reverse()
            return nums

        # Find the smallest element greater than the pivot,
        # scanning from the end of the array.
        swap = n - 1
        while swap >= 0 and nums[swap] <= nums[pivot]:
            swap -= 1

        # Swap the pivot with the next greater element.
        nums[pivot], nums[swap] = nums[swap], nums[pivot]

        # Reverse the suffix after the pivot.
        # The suffix was originally in descending order, so reversing it
        # produces the smallest possible arrangement.
        left = pivot + 1
        right = n - 1

        while left < right:
            nums[left], nums[right] = nums[right], nums[left]
            left += 1
            right -= 1

        return nums
