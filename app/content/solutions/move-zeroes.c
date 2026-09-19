/* Translated from dsa-notes/TwoPointers/MoveZeroes.py — same two-pointer
   algorithm, written the way the exam expects. */
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) { return 0; }

    int nums[1000];
    for (int i = 0; i < n; i++) {
        scanf("%d", &nums[i]);
    }

    /* 'left' is where the next non-zero belongs; 'right' scans. */
    int left = 0;
    for (int right = 0; right < n; right++) {
        if (nums[right] != 0) {
            nums[left] = nums[right];
            left++;
        }
    }

    /* Fill the tail with zeroes. */
    while (left < n) {
        nums[left] = 0;
        left++;
    }

    for (int i = 0; i < n; i++) {
        printf("%d", nums[i]);
        if (i < n - 1) printf(" ");
    }
    printf("\n");
    return 0;
}
