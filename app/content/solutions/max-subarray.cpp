#include <iostream>
#include <vector>
using namespace std;

long long maxSubarray(const vector<int> &a) {
    long long best = a[0], cur = a[0];
    for (size_t i = 1; i < a.size(); i++) {
        cur = a[i] > cur + a[i] ? a[i] : cur + a[i];
        if (cur > best) best = cur;
    }
    return best;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    cout << maxSubarray(a) << endl;
    return 0;
}
