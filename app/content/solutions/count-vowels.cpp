#include <iostream>
#include <string>

int main() {
    std::string line;
    if (!std::getline(std::cin, line)) {
        std::cout << 0 << std::endl;
        return 0;
    }

    int count = 0;
    for (size_t i = 0; i < line.size(); i++) {
        char c = line[i];
        if (c >= 'A' && c <= 'Z') {
            c = c + 32;
        }
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
            count = count + 1;
        }
    }

    std::cout << count << std::endl;
    return 0;
}
