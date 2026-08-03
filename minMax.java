public class Main {
    public static void main(String[] args) {
        int[] arr = {6,7,5,3,4,6,7,1,2,3,1,2,4};
        int min = arr[0];
        int max = arr[0];

        for (int i = 0; i < arr.length; i++) {
            if (arr[i] < min) {
                min = arr[i];
            }

            if (arr[i] > max) {
                max = arr[i];
            }
        }

      System.out.println([min, max]);
    }
}
