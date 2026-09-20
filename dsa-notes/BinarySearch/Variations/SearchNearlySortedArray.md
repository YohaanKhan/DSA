### Search in a nearly sorted array
A nearly sorted array is like a normal, perfectly increasing line, except a few numbers took a tiny step (at most 1 position) to the left or right of where they belong.

Because an element could have swapped with its neighbor, looking only at mid isn't enough. We have to look at the whole neighborhood: mid, mid-1, and mid+1.

If the target is at mid, mid-1, or mid+1, we immediately return it.

If it's not there, we can confidently decide which way to go using just arr[mid]. If arr[mid] < target, the target must be further up the line to the right. Since we already checked mid+1, we can aggressively jump past it by setting left = mid + 2.

Otherwise, if arr[mid] > target, we jump down the line to the left by setting right = mid - 2.

```python
class Solution:
    def findTarget(self, arr, target):
        left = 0
        right = len(arr) - 1
        
        while left <= right:
            mid = left + (right - left) // 2
            
            if arr[mid] == target:
                return mid
                
            if mid - 1 >= left and arr[mid-1] == target:
                return mid - 1
                
            if mid + 1 <= right and arr[mid+1] == target:
                return mid + 1
                
            if arr[mid] < target:
                left = mid + 2
                
            else:
                right = mid - 2
                
        return -1

```
