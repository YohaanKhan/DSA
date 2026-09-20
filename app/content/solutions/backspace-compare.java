// Translated from dsa-notes/TwoPointers/BackspaceStringCompare.py.
// Note what changes from Python: no list.pop() on a String, explicit
// StringBuilder, and .equals() rather than ==.
import java.util.Scanner;

public class Main {
    static String process(String input) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c == '#') {
                if (out.length() > 0) {
                    out.deleteCharAt(out.length() - 1);
                }
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        String t = sc.hasNextLine() ? sc.nextLine() : "";

        if (process(s).equals(process(t))) {
            System.out.println("true");
        } else {
            System.out.println("false");
        }
    }
}
