
import java.util.ArrayList;
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
    if (a.equals("1")) b += 1;
    else b += 2; return a + b;
  }
  public <T> void exe2(
    int a,
    ArrayList<T> b,
    Map<String, String> c
  ) {
    int d = a == 0 ? -1 : 100;
    System.out.println(d);
  }
}