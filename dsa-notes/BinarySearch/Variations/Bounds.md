### Lower Bound
We return the first position where the element is greater than or equal to a target element, the right boundary is length of the array, not length - 1, this is because when we use length - 1, we might miss the case where the target element is larger than all the elements of the array. 

```python
def lower_bound(arr, target):
    # First index where arr[i] >= target
    left, right = 0, len(arr)   # right = len, not len-1!
    while left < right:          # note: strict <
        mid = left + (right-left)//2
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left  # may equal len(arr) if target > all elements
```

### Upper Bound
We return the first position where the target is less than the element, this can be used to find the count of elements that are equal to target. Here, count = upper_bound - lower_bound

```python
def upper_bound(arr, target):
    # First index where arr[i] > target
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right-left)//2
        if arr[mid] <= target:   # note <=
            left = mid + 1
        else:
            right = mid
    return left
```

