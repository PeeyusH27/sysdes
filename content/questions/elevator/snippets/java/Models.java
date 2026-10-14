// The folder compiles with one javac call (default package), so these small value types
// share a file. In a real codebase each would be public, in its own file, in a package.

enum Dir {
    UP, DOWN;

    int sign() { return this == UP ? 1 : -1; }

    Dir opposite() { return this == UP ? DOWN : UP; }

    String arrow() { return this == UP ? "▲" : "▼"; }
}

enum CarState {
    IDLE,  // stopped at a floor, doors closed
    MOVING_UP,
    MOVING_DOWN,
    DOORS_OPEN,  // only ever entered while stopped at a floor
    OUT_OF_SERVICE
}

// A hall call is a floor plus the arrow someone pressed. Records compare by value,
// so a call is its own map key: pressing ▲ at 4 twice gives two equal calls.
record HallCall(int floor, Dir dir) {
    String key() { return floor + dir.arrow(); }
}

// What a car reports when it stops at a floor and opens its doors.
record Stop(String carId, int floor, Dir dir) {}
