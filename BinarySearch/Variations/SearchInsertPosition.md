### Search Insert Position - LC 35

```python
def search_insert(arr, target):
    # Returns index where target should be inserted
    # (same as lower_bound)
    left, right = 0, len(arr)
    while left < right:
        mid = left + (right-left)//2
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left
```

This is highly similar to finding the lower bound.

