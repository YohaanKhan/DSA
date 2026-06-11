### Find Peak Element - LeetCode 162
We need to find an element that forms a peak, that is, its value is strictly greater than any of the neighbors that surround it. We just need to return that index, the key thing to be noted here is that the array is not sorted like the normal binary search problems. Now, we might think that we might have to look at all the numbers to actually find a peak right? Uhh, thats not the case, the key insight here is to follow the slope, if we think of the array as a mountain range, and we stand at say a position mid, we just need to look at the immediate neighboring elements to decide which way to walk, so if say mid + 1 element is greater than mid, so we are currently on an upward slope, so if we search the right side we are likely to find the peak. Similarly, if it is lesser than the mid, we just gotta search the left side to find a peak. We just return the lo at the end, cause eventually lo and high will converge at the peak,

```python
def findPeakElement(nums: list[int]) -> int:
    lo, hi = 0, len(nums) - 1
    
    while lo < hi:
        mid = lo + (hi - lo) // 2
        
        if nums[mid] < nums[mid + 1]:
            # Upward slope: The peak is strictly to the right
            lo = mid + 1
        else:
            # Downward slope: mid could be the peak, or it's to the left
            hi = mid
            
    # lo and hi will converge to the peak element
    return lo
```
### Brute Force
To this question, brute force would be to perform a linear search from 1 to n-1 elements, with for each element, we look at the i - 1 and i + 1 elements, comparing it with the ith element to find the peak.
