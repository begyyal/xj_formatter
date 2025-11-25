
import java.util.ArrayList;
import java.util.Map;

public class Sample3 {
    public Sample3() { }
    public <T> void exe(
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
        if (a + 1 == 2)
            d += 2;
        else if (a == 2)
            { } // aaa
        else if (a == 3)
            d += 3;
        else d += 1;
        System.out.println(d);
    }
    class Clazz {
        Clazz(Clazz a, int b, int c) {
        }
    }
}