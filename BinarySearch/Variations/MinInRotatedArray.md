### Find Minimum in a rotated array
A rotated sorted array is like two separate climbing slopes, where the second slope drops off from the first one. The absolute minimum is the very first element of that lower slope.

Instead of comparing mid to left, we compare mid to right.

If nums[mid] > nums[right], it means mid is stuck up on the higher slope, so the drop-off point (the minimum) must be to our right. We narrow the search to the right side by doing left = mid + 1.

Otherwise, nums[mid] <= nums[right], which means the line from mid to right is a perfectly normal, increasing slope. The minimum must be at mid itself or somewhere to its left, so we move to the left side with right = mid.

Eventually, left and right squeeze together and trap the minimum element right at the finish line.


```python
class Solution(object):
    def findMin(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """

        left = 0
        right = len(nums) - 1

        while left < right:
            mid = left + (right - left) // 2

            if nums[mid] > nums[right]:
                left = mid + 1
            else:
                right = mid
                
        return nums[left]
```
