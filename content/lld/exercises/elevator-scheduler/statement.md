Build the brain of a **single elevator car**. Passengers press buttons, and each `tick()` the car does one thing: open its doors, move one floor, or wait. *Which* stop the car heads for is the scheduling policy, and the car itself must not contain an `if (policy === ...)` ladder. Adding a third policy later must not mean editing the two that already work. This is Strategy on top of a small state machine.

Implement the class `ElevatorController`:

- `ElevatorController(floors, start, policy)`: a car serving floors `0` to `floors - 1`, parked at floor `start` with its doors closed and nothing pending. `policy` is `"look"` or `"fcfs"`.
- `hallCall(floor, dir)`: someone on `floor` pressed the `"up"` or `"down"` button. Returns `true` if this is a new pending call, and `false` if the same call is already pending **or** the call is invalid: a floor outside the building, `"up"` on the top floor, `"down"` on floor `0`, or any other direction text.
- `carCall(floor)`: someone inside pressed a floor button. A car call has no direction. Returns `true` if new, `false` if already pending or the floor does not exist.
- `tick()`: advances time by one step and returns the car's status as a string: `"IDLE@f"`, `"UP@f"`, `"DOWN@f"` or `"OPEN@f"`, where `f` is the floor the car is on **after** the step.
- `state()`: the status string from the last `tick()` without advancing time. Before the first tick it is `"IDLE@<start>"`.
- `pending()`: every pending call as `[floor, kind]` pairs, with `kind` one of `"car"`, `"down"`, `"up"`, sorted by floor and then by kind in that order of spelling.

**What one tick does.** Doors stay open for exactly one tick: if the previous tick returned `OPEN`, the doors close at the start of this tick, and closing takes no time. Then:

1. If the policy says to stop at the current floor, the doors open: return `OPEN@f`. The calls it satisfied are no longer pending.
2. Otherwise, if nothing is pending, return `IDLE@f`.
3. Otherwise the car moves one floor toward the heading the policy chooses. If the policy now says to stop at the new floor, return `OPEN@f`, so arriving and opening happen in the same tick. If not, return `UP@f` or `DOWN@f`.

**The two policies**

- `"fcfs"` (first come, first served): the car serves the **oldest** pending call and ignores every other call until that one is done. It heads toward the oldest call's floor and does not stop at floors it merely passes. When it stands on that floor, it opens and satisfies **every** pending call for that floor.
- `"look"`: the car keeps a **sweep direction** (`up`, `down`, or none when idle) and serves calls in that direction. At its current floor it stops when a car call is pending there, or a hall call in the sweep direction. If **nothing lies ahead** in the sweep direction and a hall call in the opposite direction is pending there, it also stops, satisfies everything pending at that floor, and **reverses** the sweep. It heads in the sweep direction while any pending call lies ahead, and otherwise reverses. An idle car (no sweep direction) stops for anything pending at its floor, satisfying all of it, and otherwise heads toward the **nearest** pending floor, the lower floor on a tie, and that sets the sweep direction. The sweep direction is cleared when a tick finds nothing pending.

**Notes**

- Calls are never lost: a call is pending until the car opens its doors for it.
- A call made for the floor where the doors are open is just another pending call: the next tick closes the doors and, since the car is stopped there, opens them again.
- Return values must be exactly a boolean, a string or an array as described.
