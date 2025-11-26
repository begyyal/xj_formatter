
@SuppressWarnings("unused")
public class Sample4 {
    public Sample4() { }
    public void exe() {
        int a = 0, b = 0;
        for (int i = 0; i < 3; i++) {
            if (a == i
                && (b == 1)
                || (b == 2))
                return;
        }
        Runnable y = a == 3 ? () -> {
            if (a == b)
                return;
            int z = 0;
        } : () -> { };
    }
}