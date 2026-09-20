#include <iostream>
#include <string>
#include <vector>
using namespace std;

int maxFrequency(const string &s, char &which) {
    vector<int> freq(256, 0);
    for (size_t i = 0; i < s.size(); i++) freq[(unsigned char)s[i]]++;
    int best = 0;
    which = '?';
    for (int c = 0; c < 256; c++) {
        if (freq[c] > best) { best = freq[c]; which = (char)c; }
    }
    return best;
}

int main() {
    string s;
    getline(cin, s);
    char which;
    int n = maxFrequency(s, which);
    if (n == 0) cout << "none" << endl;
    else cout << which << " " << n << endl;
    return 0;
}
