// After closing, the side that closed first keeps the connection in TIME_WAIT (60 s on Linux)
// so late packets cannot leak into a new connection. Each TIME_WAIT holds one source port.
// To one destination ip:port, a client can therefore open only this many new connections per second:
export const maxNewPerSecond = (ephemeralPorts = 28232, timeWaitSeconds = 60) => ephemeralPorts / timeWaitSeconds;
