import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.hasNextLine() ? sc.nextLine() : "";

        String[] parts = line.trim().split("\\s+");
        StringBuilder out = new StringBuilder();

        for (int i = parts.length - 1; i >= 0; i--) {
            if (parts[i].isEmpty()) {
                continue;
            }
            if (out.length() > 0) {
                out.append(' ');
            }
            out.append(parts[i]);
        }

        System.out.println(out.toString());
    }
}
