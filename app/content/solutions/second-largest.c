#include <stdio.h>
#include <limits.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) { printf("%d\n", INT_MIN); return 0; }

    int arr[1000];
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }

    int best = INT_MIN;
    int second = INT_MIN;
    for (int i = 0; i < n; i++) {
        if (arr[i] > best) {
            second = best;
            best = arr[i];
        } else if (arr[i] < best && arr[i] > second) {
            second = arr[i];
        }
    }

    printf("%d\n", second);
    return 0;
}
