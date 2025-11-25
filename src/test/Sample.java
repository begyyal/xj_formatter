
import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;

public class Sample {
    public Sample() {
        System.out.println("");
    }
    @SuppressWarnings("unused")
    int hoge() { return 1; }
    public String exe() {
        var a = "";
        var b = 0;
        // comment aaaa
        this.exe2(
            b,
            null,
            null);
        /**
         * comment
         * bbbb
         */
        this.exe2(b, null, null);
        var cl = Collections.<Clazz>emptyList();
        cl.add(new Clazz(
            null,
            2,
            3
        ));
        return a;
    }
    public <T> void exe2(
        int a,
        ArrayList<T> b,
        Map<String, String> c
    ) {
    }
    class Clazz {
        Clazz(Clazz a, int b, int c) {
        }
    }
}