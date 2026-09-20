#include <stdio.h>

int digitSum(int n) {
    int sum = 0;
    if (n < 0) n = -n;
    while (n > 0) {
        sum += n % 10;
        n /= 10;
    }
    return sum;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%d\n", digitSum(n));
    return 0;
}
