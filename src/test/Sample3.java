
import java.util.ArrayList;
import java.util.Map;

@SuppressWarnings("unused")
public class Sample3 {
    public Sample3() { }
    public <T> void exe(
        int a,
        ArrayList<T> b,
        Map<String, String> c
    ) {
        int d = a == 0 ? -1 : 100;
        var clz = new Clazz(
            null,
            2,
            3
        );
        if (a + 1 == 2)
            d += 2;
        else if (a == 2)
            { } // aaa
        else if (a == 3) {
            d += 3;
        } else clz = null;
    }
    class Clazz {
        Clazz(Clazz a, int b, int c) {
        }
    }
}