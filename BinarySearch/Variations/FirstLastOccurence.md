### First Occurence

```python
def first_occurrence(arr, target):
    left, right, result = 0, len(arr)-1, -1
    while left <= right:
        mid = left + (right-left)//2
        if arr[mid] == target:
            result = mid
            right = mid - 1  # don't stop — go LEFT
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return result
```

### Note: 
When we find the element, we keep searhing the left until we find the leftmost occurence to return the first occurence.

### How does it work?
When we find the occurence for the first time, we start reducing the search space by setting the right to the value of mid - 1, what happens is that we record the mid value as the index where we found and we keep overwriting it as we find more left values.
Last occurence works on similar principle too, but in this we assign the left to mid + 1, focusing on the right half.

### Last Occurence

```python
def last_occurrence(arr, target):
    left, right, result = 0, len(arr)-1, -1
    while left <= right:
        mid = left + (right-left)//2
        if arr[mid] == target:
            result = mid
            left = mid + 1  # don't stop — go RIGHT
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return result
```

### Count Occurences
The First and Last occurrence together enables us to calculate the count of occurences of an element, we do it by using count = last - first + 1.

```python
def count_occurrences(arr, target):
    first = first_occurrence(arr, target)
    if first == -1:
        return 0
    last = last_occurrence(arr, target)
    return last - first + 1
```

Note: We conduct two binary searches to find the first index and the last index of the occurence.
