import java.util.Arrays;
import java.util.stream.Stream;

public class Sample2 {
    public Sample2() { }
    public Integer[] exe() {
        int aa = 1;
        int[] numArray = new int[10];
        var st = aa == 1
            && numArray.length == 2
            || numArray.length == 3
        ? Stream.<Clazz>empty()
        : Arrays.stream(numArray)
            .mapToObj(i -> new Clazz(null, 0, 0))
            .filter(Clazz::z);
        return st.map(cz -> cz.v).toArray(Integer[]::new);
    }
    class Clazz {
        int v;
        Clazz(Clazz a, int b, int c) {
            this.v = b;
        }
        boolean z() {
            return this.v > 0;
        }
    }
}