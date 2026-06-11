### What is binary search?

Binary Search is an efficient algorithm for finding an element in a sorted collection by repeatedly halving the search space. Instead of checking every element (linear scan, O(n)), it eliminates half the candidates with each comparison, achieving O(log n) time.


### Why does it work?

Binary search exploits a crucial property: if the array is sorted, and the middle element is too small, then every element to the left is also too small and can be discarded entirely. The same logic applies in reverse. This means each step gives us guaranteed information about half the remaining elements.

### Prequistes:
1. Sorted Array is needed.
2. The function must be consistently increasing or decreasing over search space.


<img width="807" height="435" alt="image" src="https://github.com/user-attachments/assets/4063a152-42df-410a-a175-01248d7b2a80" />


### Standard Iterative Template:

```python

def binary_search(arr, target):
    left = 0
    right = len(arr) - 1        # ← inclusive right boundary
    while left <= right:         # ← '=' handles single element
        mid = left + (right - left) // 2  # ← overflow-safe
        if arr[mid] == target:
            return mid           # ← found it
        elif arr[mid] < target:
            left = mid + 1       # ← target is in right half
        else:
            right = mid - 1      # ← target is in left half
    return -1                    # ← not found
```

### Important points:
1. We use left <= right because if we had left < right, we would miss the single element that would be the target.
2. We use left + (left + right) // 2 because sometimes left + right can overflow the int max value, thus it is better to use this form.

### Complexities:
- Time Complexity is O(log n), as the search space halves after each step.
- Space Complexity is O(1) as there are only 3 variables involved, left, right and mid.

### Recursive Binary Search

```python
def binary_search(arr, left, right, target):
    if left > right:             # ← base case: search space empty
        return -1

    mid = left + (right - left) // 2

    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        return binary_search(arr, mid + 1, right, target)
    else:
        return binary_search(arr, left, mid - 1, target)
```

Note: In interviews, iterative approach is prefered as there is no risk of overflow, and the space complexity remains constant. We may use recursive when the logic naturally branches in a way that is hard to express iteratively like performing binary search on a Binary Search Tree.
