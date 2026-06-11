### Floor of an element
Floor is the largest element that is less than or equal to target, for this when arr[mid] is less than or equal to target, it is a valid candidate and we continue the search to the right of it, but remember to store it.

```python
def floor(arr, target):
    left, right, result = 0, len(arr)-1, -1
    while left <= right:
        mid = left + (right-left)//2
        if arr[mid] <= target:
            result = arr[mid]    # candidate for floor
            left = mid + 1       # look for larger valid value
        else:
            right = mid - 1
    return result
```

### Ceil of an element
Ceil is the smallest element that is less than or equal to the target, we continue searching to the left of it for an even more smaller valid element.

```python
def ceil(arr, target):
    left, right, result = -1, len(arr)-1, -1
    while left <= right:
        mid = left + (right-left)//2
        if arr[mid] >= target:
            result = arr[mid]    # candidate for ceil
            right = mid - 1      # look for smaller valid value
        else:
            left = mid + 1
    return result
```
