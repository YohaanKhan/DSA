import java.util.Scanner;

public class Main {
    static int sumMultiples(int n) {
        int total = 0;
        for (int i = 1; i <= n; i++) {
            if (i % 3 == 0 || i % 5 == 0) total += i;
        }
        return total;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.hasNextInt() ? sc.nextInt() : 0;
        System.out.println(sumMultiples(n));
    }
}
