
public class Sample {
  public Sample() {
    System.out.println("");
  }
  public String exe() {
    var a = "";
    var b = 0;
    if (a.equals("1")) b += 1;
    else b += 2; return a + b;
  }
  public <T> void exe2(
    int a,
    T b
  ) {
    int c = a == 0 ? -1 : 100;
    System.out.println(c);
  }
}