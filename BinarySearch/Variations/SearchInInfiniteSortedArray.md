### Search in Infinite Sorted Array

To search in an infinite sorted array, we can apply binary search but first we need a term to use as the right pointer, which was often the end of the array, which cannot be so in this case. 
So, the thing we can do is to keep increasing the right pointer index as long as the value of the element at the right pointer ends up being larger than the target we are looking for. After that we can apply binary search treating the left and right pointer as the search space and then finding the index value of the target element if it exists.

```python
def search_infinite(arr, target):
    # Step 1: Find bounds
    lo, hi = 0, 1
    while arr[hi] < target:
        lo = hi
        hi *= 2    # exponential doubling
    # Step 2: Standard binary search in [lo, hi]
    while lo <= hi:
        mid = lo + (hi-lo)//2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid+1
        else: hi = mid-1
    return -1
```

