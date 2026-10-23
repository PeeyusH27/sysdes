from hold import RoomHolds  # @hide
# The clock is a variable you control. Move it and watch the hold expire.
clock = [0]  # seconds
holds = RoomHolds(now=lambda: clock[0])  # the default hold lasts 10 minutes

print(holds.hold("A"))    # True
clock[0] = 599.999
print(holds.hold("A"))    # False: one millisecond left
clock[0] = 600
print(holds.hold("A"))    # True: the hold expired, so a new one starts
print(holds.is_held("A")) # True
