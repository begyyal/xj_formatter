
import java.util.ArrayList;
import java.util.Map;

public class Sample3 {
    public Sample3() { }
    public <T> int exe(
        int a,
        ArrayList<T> b,
        Map<String, String> c
    ) {
        int d = a == 0 ? -1 : 100;
        System.out.println(d);
        var clz = new Clazz(
            null,
            2,
            3
        );
        System.out.println(clz);
        if (a == 1)
            d += 1; // !!!todo
        else d += 2; return d;
    }
    class Clazz {
        Clazz(Clazz a, int b, int c) {
        }
    }
}