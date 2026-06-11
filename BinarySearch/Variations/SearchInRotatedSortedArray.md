### Search in rotated sorted array

So lets visualize a bit, a rotated sorted array is like two seperate climbing slopes, where the second slope suddenly drops off from the first one.

When we pick a mid point, it would land on one of two places:
1. On the higher slope
2. On the lower slope

Thus, the space between the pointer and mid would be guaranteed to be a normally sorted line.

First we find the half where the numbers are steadily increasing, and then we can do a simple check by checking if the target is a value between the pointer and the mid, if it is, then we narrow the search on the side or we just need to move to the other side.

```python
def search_rotated(arr, target):
    left, right = 0, len(arr)-1
    while left <= right:
        mid = left + (right-left)//2
        if arr[mid] == target: return mid
        # Determine which half is sorted
        if arr[left] <= arr[mid]:  # left half sorted
            if arr[left] <= target < arr[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:  # right half sorted
            if arr[mid] < target <= arr[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1
```


