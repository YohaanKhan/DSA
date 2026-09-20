#include <stdio.h>

int binarySearch(int *a, int n, int target) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

int main(void) {
    int n, target;
    if (scanf("%d", &n) != 1) return 0;
    int a[100000];
    for (int i = 0; i < n; i++) { if (scanf("%d", &a[i]) != 1) return 0; }
    if (scanf("%d", &target) != 1) return 0;
    printf("%d\n", binarySearch(a, n, target));
    return 0;
}
